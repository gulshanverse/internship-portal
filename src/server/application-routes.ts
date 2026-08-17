import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './middleware';
import { createApplication, getMyApplication, listMyApplications, submitMyApplication } from './application-service';

const resumeSchema = z.object({ filename: z.string().trim().min(1).max(255), mimeType: z.string().min(1).max(100), sizeBytes: z.number().int().positive() }).optional();
const applicationSchema = z.object({ internshipId: z.string().min(1), skills: z.array(z.string().trim().min(1).max(80)).min(1).max(30), phone: z.string().trim().min(7).max(30).optional(), college: z.string().trim().max(200).optional(), course: z.string().trim().max(200).optional(), graduationYear: z.number().int().min(1950).max(new Date().getFullYear() + 10).optional(), bio: z.string().trim().max(1500).optional(), linkedinUrl: z.string().url().max(500).optional(), githubUrl: z.string().url().max(500).optional(), portfolioUrl: z.string().url().max(500).optional(), resume: resumeSchema });

export const applicationRouter = Router();
applicationRouter.use(requireRole('STUDENT'));

applicationRouter.get('/applications', async (req, res, next) => { try { return res.json({ data: await listMyApplications(req.auth!.user.id) }); } catch (error) { next(error); } });
applicationRouter.get('/applications/:publicId', async (req, res, next) => { try { const application = await getMyApplication(req.auth!.user.id, String(req.params.publicId)); if (!application) return res.status(404).json({ error: 'NOT_FOUND', message: 'Application not found.' }); return res.json({ data: application }); } catch (error) { next(error); } });
applicationRouter.post('/applications', async (req, res, next) => { try { const application = await createApplication(req.auth!.user.id, applicationSchema.parse(req.body)); return res.status(201).json({ data: application }); } catch (error) { next(error); } });
applicationRouter.post('/applications/:publicId/submit', async (req, res, next) => { try { const application = await submitMyApplication(req.auth!.user.id, String(req.params.publicId)); return res.json({ data: application }); } catch (error) { next(error); } });
