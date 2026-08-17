import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './middleware';
import { addApplicationNote, getApplicationDetail, listApplications, transitionApplication } from './admin-review-service';

const statusSchema = z.enum(['DRAFT', 'SUBMITTED', 'ASSESSMENT_PENDING', 'ASSESSMENT_COMPLETED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'ONBOARDING', 'ACTIVE', 'COMPLETED']);
const transitionSchema = z.object({ status: statusSchema, notes: z.string().trim().max(3000).optional() });

export const adminReviewRouter = Router();
adminReviewRouter.use(requireRole('ADMIN'));

adminReviewRouter.get('/admin/applications', async (req, res, next) => { try { const result = await listApplications({ page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 25, status: typeof req.query.status === 'string' ? statusSchema.parse(req.query.status) : undefined, domainId: typeof req.query.domainId === 'string' ? req.query.domainId : undefined, internshipId: typeof req.query.internshipId === 'string' ? req.query.internshipId : undefined, search: typeof req.query.search === 'string' ? req.query.search : undefined }); return res.json(result); } catch (error) { next(error); } });
adminReviewRouter.get('/admin/applications/:id', async (req, res, next) => { try { const application = await getApplicationDetail(String(req.params.id)); if (!application) return res.status(404).json({ error: 'NOT_FOUND', message: 'Application not found.' }); return res.json({ data: application }); } catch (error) { next(error); } });
adminReviewRouter.post('/admin/applications/:id/transition', async (req, res, next) => { try { const input = transitionSchema.parse(req.body); const data = await transitionApplication(String(req.params.id), req.auth!.user.id, input.status, input.notes); return res.json({ data }); } catch (error) { next(error); } });
adminReviewRouter.post('/admin/applications/:id/note', async (req, res, next) => { try { const notes = z.object({ notes: z.string().trim().min(1).max(3000) }).parse(req.body).notes; return res.json({ data: await addApplicationNote(String(req.params.id), req.auth!.user.id, notes) }); } catch (error) { next(error); } });
