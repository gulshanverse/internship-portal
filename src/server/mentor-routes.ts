import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './middleware';
import { assignMentor, getMentorDashboard, reviewSubmission, scheduleMentorshipSession } from './mentor-service';

export const mentorRouter = Router();
mentorRouter.get('/mentor/dashboard', requireRole('MENTOR'), async (req, res, next) => { try { return res.json({ data: await getMentorDashboard(req.auth!.user.id) }); } catch (error) { next(error); } });
mentorRouter.post('/mentor/submissions/:id/review', requireRole('MENTOR'), async (req, res, next) => { try { const input = z.object({ status: z.enum(['APPROVED', 'NEEDS_REVISION']), message: z.string().trim().min(1).max(3000), rating: z.number().int().min(1).max(5).optional() }).parse(req.body); return res.json({ data: await reviewSubmission(req.auth!.user.id, String(req.params.id), input.status, input.message, input.rating) }); } catch (error) { next(error); } });
mentorRouter.post('/mentor/sessions', requireRole('MENTOR'), async (req, res, next) => { try { const input = z.object({ studentId: z.string().min(1), projectAssignmentId: z.string().min(1).optional(), scheduledAt: z.coerce.date(), durationMinutes: z.number().int().positive().max(240), notes: z.string().max(2000).optional() }).parse(req.body); return res.status(201).json({ data: await scheduleMentorshipSession(req.auth!.user.id, input) }); } catch (error) { next(error); } });
mentorRouter.post('/admin/projects/:id/mentor', requireRole('ADMIN'), async (req, res, next) => { try { const mentorId = z.object({ mentorId: z.string().min(1) }).parse(req.body).mentorId; return res.json({ data: await assignMentor(req.auth!.user.id, String(req.params.id), mentorId) }); } catch (error) { next(error); } });
