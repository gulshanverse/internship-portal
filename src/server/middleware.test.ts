import { describe, expect, it, vi } from 'vitest';
import { requireRole, requireSameUser } from './middleware';

describe('authorization middleware', () => {
  it('returns 401 when no session is present', () => {
    const req = { auth: undefined } as never;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const next = vi.fn();
    requireRole('ADMIN')(req, { status } as never, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the authenticated role is not allowed', () => {
    const req = { auth: { user: { id: 'student-a', role: 'STUDENT' } } } as never;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const next = vi.fn();
    requireRole('MENTOR')(req, { status } as never, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows the same user and admin, but denies another non-admin user', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const response = { status } as never;
    expect(requireSameUser('student-a', { auth: { user: { id: 'student-a', role: 'STUDENT' } } } as never, response)).toBe(true);
    expect(requireSameUser('student-a', { auth: { user: { id: 'admin-a', role: 'ADMIN' } } } as never, response)).toBe(true);
    expect(requireSameUser('student-a', { auth: { user: { id: 'student-b', role: 'STUDENT' } } } as never, response)).toBe(false);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalled();
  });
});
