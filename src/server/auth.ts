import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import type { User, UserRole, UserStatus } from '@prisma/client';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const RESET_TTL_MS = 1000 * 60 * 30;

export type PublicUser = Pick<User, 'id' | 'email' | 'role' | 'status' | 'createdAt'>;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function serializeUser(user: User): PublicUser {
  return { id: user.id, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = newToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return token;
}

export async function resolveSession(token: string | undefined) {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  if (session.user.status !== 'ACTIVE') return null;
  return { session, user: session.user };
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  await prisma.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function issuePasswordResetToken(userId: string) {
  const token = newToken();
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
  return token;
}

export async function consumePasswordResetToken(token: string, password: string) {
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return false;
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  return true;
}

export type AuthUser = PublicUser & { role: UserRole; status: UserStatus };
