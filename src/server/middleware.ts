import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { resolveSession } from './auth';

export const SESSION_COOKIE = 'internship_session';

declare global {
  namespace Express {
    interface Request {
      auth?: Awaited<ReturnType<typeof resolveSession>>;
    }
  }
}

export async function loadAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.auth = await resolveSession(req.cookies?.[SESSION_COOKIE]);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to continue.' });
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to continue.' });
    if (!roles.includes(req.auth.user.role)) return res.status(403).json({ error: 'PERMISSION_DENIED', message: 'You do not have permission to access this resource.' });
    next();
  };
}

export function requireSameUser(userId: string | undefined, req: Request, res: Response) {
  if (!req.auth) {
    res.status(401).json({ error: 'AUTHENTICATION_REQUIRED', message: 'Please sign in to continue.' });
    return false;
  }
  if (req.auth.user.role !== 'ADMIN' && req.auth.user.id !== userId) {
    res.status(403).json({ error: 'PERMISSION_DENIED', message: 'You do not have permission to access this resource.' });
    return false;
  }
  return true;
}
