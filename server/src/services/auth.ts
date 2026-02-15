import { v4 as uuid } from 'uuid';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, validatePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateMagicLinkToken } from '../utils/tokens';
import { AppError } from '../middleware/error';
import { sendInvitationEmail } from './email';
import { isValidUsername, isValidEmail } from '../utils/validation';

export async function seedAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log('No ADMIN_USERNAME/ADMIN_PASSWORD env vars set, skipping admin seed.');
    return;
  }

  const existing = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
  if (existing) {
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  db.insert(schema.users).values({
    id: uuid(),
    username,
    email: '',
    passwordHash,
    isAdmin: true,
    isTemporary: true,
    createdAt: now,
    updatedAt: now,
  }).run();

  console.log(`Admin user "${username}" created. Please log in and complete setup.`);
}

export async function login(username: string, password: string) {
  const user = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
  if (!user) {
    throw new AppError(401, 'Invalid username or password');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid username or password');
  }

  const authUser = {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    isTemporary: user.isTemporary,
  };

  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken(user.id);

  return { accessToken, refreshToken, user: authUser };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const { id } = verifyRefreshToken(refreshToken);
    const user = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const authUser = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      isTemporary: user.isTemporary,
    };

    const accessToken = generateAccessToken(authUser);
    const newRefreshToken = generateRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken, user: authUser };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'Invalid refresh token');
  }
}

export async function setupAccount(userId: string, username: string, password: string, email: string) {
  if (!isValidUsername(username)) {
    throw new AppError(400, 'Username must be between 2 and 30 characters');
  }
  if (!isValidEmail(email)) {
    throw new AppError(400, 'A valid email address is required');
  }
  const validationError = validatePassword(password);
  if (validationError) {
    throw new AppError(400, validationError);
  }

  // Check if username is taken by another user
  const existingUser = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
  if (existingUser && existingUser.id !== userId) {
    throw new AppError(400, 'Username already taken');
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  db.update(schema.users)
    .set({
      username,
      email,
      passwordHash,
      isTemporary: false,
      updatedAt: now,
    })
    .where(eq(schema.users.id, userId))
    .run();

  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) throw new AppError(500, 'User not found after update');

  const authUser = {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    isTemporary: user.isTemporary,
  };

  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken(user.id);

  return { accessToken, refreshToken, user: authUser };
}

export async function createInvitation(email: string, invitedById: string) {
  const token = generateMagicLinkToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const inviter = db.select().from(schema.users).where(eq(schema.users.id, invitedById)).get();
  if (!inviter) throw new AppError(500, 'Inviter not found');

  db.insert(schema.invitations).values({
    id: uuid(),
    email,
    token,
    invitedBy: invitedById,
    expiresAt,
    createdAt: now,
  }).run();

  await sendInvitationEmail(email, token, inviter.username);

  return { email, token, expiresAt };
}

export async function validateInvitation(token: string) {
  const invitation = db.select().from(schema.invitations).where(eq(schema.invitations.token, token)).get();
  if (!invitation) {
    throw new AppError(404, 'Invitation not found');
  }
  if (invitation.usedAt) {
    throw new AppError(400, 'Invitation has already been used');
  }
  if (new Date(invitation.expiresAt) < new Date()) {
    throw new AppError(400, 'Invitation has expired');
  }

  const inviter = db.select().from(schema.users).where(eq(schema.users.id, invitation.invitedBy)).get();

  return {
    email: invitation.email,
    invitedByUsername: inviter?.username || 'Unknown',
  };
}

export async function registerWithInvitation(token: string, username: string, password: string) {
  const invitation = db.select().from(schema.invitations).where(eq(schema.invitations.token, token)).get();
  if (!invitation) throw new AppError(404, 'Invitation not found');
  if (invitation.usedAt) throw new AppError(400, 'Invitation has already been used');
  if (new Date(invitation.expiresAt) < new Date()) throw new AppError(400, 'Invitation has expired');

  if (!isValidUsername(username)) {
    throw new AppError(400, 'Username must be between 2 and 30 characters');
  }
  const validationError = validatePassword(password);
  if (validationError) throw new AppError(400, validationError);

  const existingUser = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
  if (existingUser) throw new AppError(400, 'Username already taken');

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  const userId = uuid();

  db.insert(schema.users).values({
    id: userId,
    username,
    email: invitation.email,
    passwordHash,
    isAdmin: false,
    isTemporary: false,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.update(schema.invitations)
    .set({ usedAt: now })
    .where(eq(schema.invitations.id, invitation.id))
    .run();

  const authUser = {
    id: userId,
    username,
    isAdmin: false,
    isTemporary: false,
  };

  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken(userId);

  return { accessToken, refreshToken, user: authUser };
}
