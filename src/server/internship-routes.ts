import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './middleware';
import { archiveInternship, createDomain, createInternship, getDomainBySlug, getInternshipBySlug, listDomains, listInternships, updateDomain, updateInternship } from './internship-service';

const domainSchema = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(100), description: z.string().trim().min(10).max(500), accent: z.string().max(20).optional(), icon: z.string().max(100).optional() });
const internshipSchema = z.object({ domainId: z.string().min(1), title: z.string().trim().min(3).max(150), slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(150), description: z.string().trim().min(20).max(2000), duration: z.string().trim().min(2).max(80), mode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']), level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']), eligibility: z.array(z.string().max(300)).max(20).default([]), responsibilities: z.array(z.string().max(500)).max(30).default([]), learningOutcomes: z.array(z.string().max(500)).max(30).default([]), skills: z.array(z.string().max(100)).max(30).default([]), projectDescription: z.string().max(2000).optional(), applicationDeadline: z.coerce.date().optional(), capacity: z.number().int().positive().max(1000).optional(), published: z.boolean().default(false) });

export const internshipRouter = Router();

internshipRouter.get('/domains', async (_req, res, next) => { try { res.json({ data: await listDomains() }); } catch (error) { next(error); } });
internshipRouter.get('/domains/:slug', async (req, res, next) => { try { const domain = await getDomainBySlug(req.params.slug); if (!domain) return res.status(404).json({ error: 'NOT_FOUND', message: 'Domain not found.' }); return res.json({ data: domain }); } catch (error) { next(error); } });
internshipRouter.get('/internships', async (req, res, next) => { try { const data = await listInternships({ search: typeof req.query.search === 'string' ? req.query.search : undefined, domainSlug: typeof req.query.domain === 'string' ? req.query.domain : undefined }); return res.json({ data }); } catch (error) { next(error); } });
internshipRouter.get('/internships/:slug', async (req, res, next) => { try { const internship = await getInternshipBySlug(req.params.slug); if (!internship) return res.status(404).json({ error: 'NOT_FOUND', message: 'Internship not found.' }); return res.json({ data: internship }); } catch (error) { next(error); } });

internshipRouter.use('/admin/domains', requireRole('ADMIN'));
internshipRouter.post('/admin/domains', async (req, res, next) => { try { res.status(201).json({ data: await createDomain(domainSchema.parse(req.body)) }); } catch (error) { next(error); } });
internshipRouter.patch('/admin/domains/:id', async (req, res, next) => { try { res.json({ data: await updateDomain(String(req.params.id), domainSchema.partial().parse(req.body)) }); } catch (error) { next(error); } });
internshipRouter.post('/admin/domains/:id/publish', async (req, res, next) => { try { res.json({ data: await updateDomain(String(req.params.id), { active: true }) }); } catch (error) { next(error); } });
internshipRouter.post('/admin/domains/:id/unpublish', async (req, res, next) => { try { res.json({ data: await updateDomain(String(req.params.id), { active: false }) }); } catch (error) { next(error); } });

internshipRouter.post('/admin/internships', requireRole('ADMIN'), async (req, res, next) => { try { res.status(201).json({ data: await createInternship(internshipSchema.parse(req.body)) }); } catch (error) { next(error); } });
internshipRouter.patch('/admin/internships/:id', requireRole('ADMIN'), async (req, res, next) => { try { res.json({ data: await updateInternship(String(req.params.id), internshipSchema.partial().parse(req.body)) }); } catch (error) { next(error); } });
internshipRouter.post('/admin/internships/:id/publish', requireRole('ADMIN'), async (req, res, next) => { try { res.json({ data: await updateInternship(String(req.params.id), { published: true, archived: false }) }); } catch (error) { next(error); } });
internshipRouter.post('/admin/internships/:id/unpublish', requireRole('ADMIN'), async (req, res, next) => { try { res.json({ data: await updateInternship(String(req.params.id), { published: false }) }); } catch (error) { next(error); } });
internshipRouter.delete('/admin/internships/:id', requireRole('ADMIN'), async (req, res, next) => { try { await archiveInternship(String(req.params.id)); return res.status(204).send(); } catch (error) { next(error); } });
