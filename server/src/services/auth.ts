import { v4 as uuid } from 'uuid';
import { db, schema, sqlite } from '../db';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, validatePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateMagicLinkToken } from '../utils/tokens';
import { AppError } from '../middleware/error';
import { sendInvitationEmail } from './email';
import { isValidUsername, isValidEmail } from '../utils/validation';

// A5: Dummy hash for timing oracle prevention — generated fresh at startup
let DUMMY_HASH: string;
export async function initDummyHash(): Promise<void> {
  DUMMY_HASH = await hashPassword('dummy-password-for-timing-oracle');
}

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
  const user = db.select().from(schema.users).where(sql`lower(${schema.users.username}) = lower(${username})`).get();

  // A5: Prevent timing oracle — always run bcrypt even if user not found
  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
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
    locale: user.locale,
  };

  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken(user.id, user.tokenVersion);

  return { accessToken, refreshToken, user: authUser };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const { id, tokenVersion } = verifyRefreshToken(refreshToken);
    const user = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // A2: Verify tokenVersion matches — reject if user has revoked tokens
    if (user.tokenVersion !== tokenVersion) {
      throw new AppError(401, 'Token has been revoked');
    }

    const authUser = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      isTemporary: user.isTemporary,
      locale: user.locale,
    };

    const accessToken = generateAccessToken(authUser);
    const newRefreshToken = generateRefreshToken(user.id, user.tokenVersion);

    return { accessToken, refreshToken: newRefreshToken, user: authUser };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'Invalid refresh token');
  }
}

export async function setupAccount(userId: string, username: string, password: string, email: string) {
  const trimmedUsername = username.trim();
  const normalizedEmail = email.toLowerCase().trim();
  if (!isValidUsername(trimmedUsername)) {
    throw new AppError(400, 'Username must be 2-30 characters: letters, numbers, spaces, hyphens, underscores. Must start and end with a letter or number.');
  }
  if (!isValidEmail(normalizedEmail)) {
    throw new AppError(400, 'A valid email address is required');
  }
  const validationError = validatePassword(password);
  if (validationError) {
    throw new AppError(400, validationError);
  }

  // Check if username is taken by another user (case-insensitive)
  const existingUser = db.select().from(schema.users).where(sql`lower(${schema.users.username}) = ${trimmedUsername.toLowerCase()}`).get();
  if (existingUser && existingUser.id !== userId) {
    throw new AppError(400, 'Username already taken');
  }

  // B2: Check email uniqueness
  const existingEmail = db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${normalizedEmail}`).get();
  if (existingEmail && existingEmail.id !== userId) {
    throw new AppError(400, 'Email already in use');
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  db.update(schema.users)
    .set({
      username: trimmedUsername,
      email: normalizedEmail,
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
    locale: user.locale,
  };

  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken(user.id, user.tokenVersion);

  return { accessToken, refreshToken, user: authUser };
}

export async function createInvitation(email: string, invitedById: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const token = generateMagicLinkToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const inviter = db.select().from(schema.users).where(eq(schema.users.id, invitedById)).get();
  if (!inviter) throw new AppError(500, 'Inviter not found');

  db.insert(schema.invitations).values({
    id: uuid(),
    email: normalizedEmail,
    token,
    invitedBy: invitedById,
    expiresAt,
    createdAt: now,
  }).run();

  await sendInvitationEmail(normalizedEmail, token, inviter.username, inviter.locale);

  // A4: Don't return token in API response
  return { email: normalizedEmail, expiresAt };
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
  const trimmedUsername = username.trim();
  if (!isValidUsername(trimmedUsername)) {
    throw new AppError(400, 'Username must be 2-30 characters: letters, numbers, spaces, hyphens, underscores. Must start and end with a letter or number.');
  }
  const validationError = validatePassword(password);
  if (validationError) throw new AppError(400, validationError);

  // Hash password before transaction (async operation)
  const passwordHash = await hashPassword(password);

  const now = new Date().toISOString();
  const userId = uuid();

  // Use a synchronous transaction to prevent TOCTOU race on invitation use
  const register = sqlite.transaction(() => {
    const invitation = db.select().from(schema.invitations).where(eq(schema.invitations.token, token)).get();
    if (!invitation) throw new AppError(404, 'Invitation not found');
    if (invitation.usedAt) throw new AppError(400, 'Invitation has already been used');
    if (new Date(invitation.expiresAt) < new Date()) throw new AppError(400, 'Invitation has expired');

    // Case-insensitive uniqueness check
    const existingUser = db.select().from(schema.users).where(sql`lower(${schema.users.username}) = ${trimmedUsername.toLowerCase()}`).get();
    if (existingUser) throw new AppError(400, 'Username already taken');

    // A11: Normalize email on write
    const normalizedEmail = invitation.email.toLowerCase().trim();

    db.insert(schema.users).values({
      id: userId,
      username: trimmedUsername,
      email: normalizedEmail,
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

    return normalizedEmail;
  });

  register();

  const authUser = {
    id: userId,
    username: trimmedUsername,
    isAdmin: false,
    isTemporary: false,
    locale: 'en',
  };

  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken(userId, 0);

  return { accessToken, refreshToken, user: authUser };
}
