import { Router } from 'express';
import { requireRole } from './middleware';
import { getStudentDashboard } from './student-dashboard-service';

export const studentDashboardRouter = Router();
studentDashboardRouter.get('/student/dashboard', requireRole('STUDENT'), async (req, res, next) => { try { return res.json({ data: await getStudentDashboard(req.auth!.user.id) }); } catch (error) { next(error); } });
