import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ prisma: {} }));

import { hashPassword, verifyPassword } from './auth';
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
});
