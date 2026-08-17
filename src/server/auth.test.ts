import { describe, expect, it, vi } from 'vitest';

const { transaction, sessionDeleteMany, resetDeleteMany } = vi.hoisted(() => ({ transaction: vi.fn(), sessionDeleteMany: vi.fn(), resetDeleteMany: vi.fn() }));
vi.mock('./db', () => ({ prisma: { $transaction: transaction, session: { deleteMany: sessionDeleteMany }, passwordResetToken: { deleteMany: resetDeleteMany } } }));

import { cleanupExpiredAuthArtifacts, hashPassword, verifyPassword } from './auth';
import { requireRole } from './middleware';

describe('authentication primitives', () => {
  it('hashes passwords without retaining the plaintext', async () => {
    const password = 'correct horse battery staple';
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  it('rejects unauthenticated role access', () => {
    const req = { auth: null } as never;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as never;
    const next = vi.fn();
    requireRole('ADMIN')(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an authenticated user without the required role', () => {
    const req = { auth: { user: { role: 'STUDENT' } } } as never;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as never;
    const next = vi.fn();
    requireRole('ADMIN')(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('deletes only expired or revoked authentication artifacts', async () => {
    const now = new Date('2026-08-18T00:00:00.000Z');
    const sessionDelete = { count: 2 };
    const resetDelete = { count: 1 };
    sessionDeleteMany.mockReturnValueOnce({ model: 'session-delete' });
    resetDeleteMany.mockReturnValueOnce({ model: 'reset-delete' });
    transaction.mockResolvedValueOnce([sessionDelete, resetDelete]);
    await expect(cleanupExpiredAuthArtifacts(now)).resolves.toEqual({ sessions: 2, passwordResetTokens: 1 });
    expect(transaction).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({}),
      expect.objectContaining({}),
    ]));
  });
});
