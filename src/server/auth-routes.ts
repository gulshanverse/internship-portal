import { Router } from 'express';
import { z } from 'zod';
import { prisma } from './db';
import { consumePasswordResetToken, createSession, hashPassword, issuePasswordResetToken, revokeAllSessions, revokeSession, serializeUser, verifyPassword } from './auth';
import { requireAuth, requireRole, SESSION_COOKIE } from './middleware';

const signupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  fullName: z.string().trim().min(2).max(120),
});
const loginSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
const resetSchema = z.object({ token: z.string().min(32), password: z.string().min(12).max(128) });

const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 1000 * 60 * 60 * 24 * 7 };

export const authRouter = Router();

authRouter.post('/signup', async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'EMAIL_IN_USE', message: 'An account with this email already exists.' });
    const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(input.password), studentProfile: { create: { fullName: input.fullName } } } });
    const sessionToken = await createSession(user.id);
    res.cookie(SESSION_COOKIE, sessionToken, cookieOptions);
    return res.status(201).json({ user: serializeUser(user) });
  } catch (error) { next(error); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    if (user.status !== 'ACTIVE') return res.status(403).json({ error: 'ACCOUNT_UNAVAILABLE', message: 'This account is not available.' });
    const sessionToken = await createSession(user.id);
    res.cookie(SESSION_COOKIE, sessionToken, cookieOptions);
    return res.json({ user: serializeUser(user) });
  } catch (error) { next(error); }
});

authRouter.post('/logout', async (req, res, next) => {
  try { await revokeSession(req.cookies?.[SESSION_COOKIE]); res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' }); return res.status(204).send(); } catch (error) { next(error); }
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.auth!.user }));

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const email = z.object({ email: z.string().trim().email().max(254) }).parse(req.body).email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await issuePasswordResetToken(user.id);
      if (process.env.NODE_ENV !== 'production') console.info(`[development] password reset token issued for ${email}: ${token}`);
      // Email delivery is intentionally disabled until a provider is configured.
    }
    return res.json({ message: 'If an account exists, reset instructions will be sent shortly.', emailDeliveryEnabled: Boolean(process.env.EMAIL_PROVIDER_API_KEY) });
  } catch (error) { next(error); }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const input = resetSchema.parse(req.body);
    const consumed = await consumePasswordResetToken(input.token, input.password);
    if (!consumed) return res.status(400).json({ error: 'INVALID_RESET_TOKEN', message: 'This reset link is invalid or expired.' });
    return res.json({ message: 'Password reset successfully. Please sign in again.' });
  } catch (error) { next(error); }
});

authRouter.post('/logout-all', requireAuth, async (req, res, next) => {
  try { await revokeAllSessions(req.auth!.user.id); return res.status(204).send(); } catch (error) { next(error); }
});

authRouter.get('/admin-check', requireRole('ADMIN'), (_req, res) => res.json({ ok: true }));
