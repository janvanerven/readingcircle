import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSetupComplete } from '../middleware/auth';
import { createInvitation } from '../services/auth';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import { isValidEmail } from '../utils/validation';

export const invitationRoutes = Router();

invitationRoutes.use(authenticate);
invitationRoutes.use(requireSetupComplete);

// Create invitation (admin only)
invitationRoutes.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'A valid email address is required' });
      return;
    }
    const result = await createInvitation(email, req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// List invitations (admin only)
invitationRoutes.get('/', requireAdmin, (_req: Request, res: Response) => {
  const invitations = db
    .select({
      id: schema.invitations.id,
      email: schema.invitations.email,
      invitedBy: schema.invitations.invitedBy,
      invitedByUsername: schema.users.username,
      expiresAt: schema.invitations.expiresAt,
      usedAt: schema.invitations.usedAt,
      createdAt: schema.invitations.createdAt,
    })
    .from(schema.invitations)
    .leftJoin(schema.users, eq(schema.invitations.invitedBy, schema.users.id))
    .all();

  res.json(invitations.map(inv => ({
    ...inv,
    used: !!inv.usedAt,
  })));
});
