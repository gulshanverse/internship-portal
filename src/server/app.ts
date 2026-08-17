import express from 'express';
import cookieParser from 'cookie-parser';
import { ZodError } from 'zod';
import { authRouter } from './auth-routes';
import { internshipRouter } from './internship-routes';
import { applicationRouter } from './application-routes';
import { assessmentRouter } from './assessment-routes';
import { adminReviewRouter } from './admin-review-routes';
import { studentDashboardRouter } from './student-dashboard-routes';
import { loadAuth, requireAuth, requireRole } from './middleware';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(loadAuth);

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'internship-portal' }));
  app.use('/api/auth', authRouter);
  app.use('/api', internshipRouter);
  app.use('/api', applicationRouter);
  app.use('/api', assessmentRouter);
  app.use('/api', adminReviewRouter);
  app.use('/api', studentDashboardRouter);
  app.get('/api/profile', requireAuth, (req, res) => res.json({ user: req.auth!.user }));
  app.get('/api/admin/health', requireRole('ADMIN'), (_req, res) => res.json({ ok: true, scope: 'admin' }));
  app.get('/api/mentor/health', requireRole('MENTOR', 'ADMIN'), (_req, res) => res.json({ ok: true, scope: 'mentor' }));
  app.get('/api/student/health', requireRole('STUDENT', 'ADMIN'), (_req, res) => res.json({ ok: true, scope: 'student' }));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Please check the submitted fields.', fields: error.flatten().fieldErrors });
    console.error(error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' });
  });
  return app;
}
