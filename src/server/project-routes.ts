import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './middleware';
import { archiveProjectTemplate, assignProject, createProjectTemplate, getStudentProjects, listProjectTemplates, startTask, submitTask, updateProjectTemplate } from './project-service';

const templateSchema = z.object({ domainId: z.string().min(1), internshipId: z.string().min(1).optional(), title: z.string().trim().min(3).max(200), description: z.string().trim().min(10).max(3000), objective: z.string().trim().min(10).max(2000), expectedOutcome: z.string().trim().min(10).max(2000), technologies: z.array(z.string().max(100)).max(30).default([]), difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'), evaluationCriteria: z.unknown().optional(), active: z.boolean().default(false) });
const assignSchema = z.object({ projectTemplateId: z.string().min(1), studentId: z.string().min(1), mentorId: z.string().min(1), applicationId: z.string().min(1), startDate: z.coerce.date(), deadline: z.coerce.date() });

export const projectRouter = Router();
projectRouter.get('/student/projects', requireRole('STUDENT'), async (req, res, next) => { try { return res.json({ data: await getStudentProjects(req.auth!.user.id) }); } catch (error) { next(error); } });
projectRouter.post('/student/tasks/:id/start', requireRole('STUDENT'), async (req, res, next) => { try { return res.json({ data: await startTask(req.auth!.user.id, String(req.params.id)) }); } catch (error) { next(error); } });
projectRouter.post('/student/tasks/:id/submit', requireRole('STUDENT'), async (req, res, next) => { try { const input = z.object({ content: z.string().max(10000).optional(), repositoryUrl: z.string().url().max(500).optional(), fileStorageKey: z.string().max(500).optional() }).parse(req.body); return res.status(201).json({ data: await submitTask(req.auth!.user.id, String(req.params.id), input) }); } catch (error) { next(error); } });
projectRouter.get('/admin/project-templates', requireRole('ADMIN'), async (_req, res, next) => { try { return res.json({ data: await listProjectTemplates(true) }); } catch (error) { next(error); } });
projectRouter.post('/admin/project-templates', requireRole('ADMIN'), async (req, res, next) => { try { return res.status(201).json({ data: await createProjectTemplate(templateSchema.parse(req.body) as never) }); } catch (error) { next(error); } });
projectRouter.patch('/admin/project-templates/:id', requireRole('ADMIN'), async (req, res, next) => { try { return res.json({ data: await updateProjectTemplate(String(req.params.id), templateSchema.partial().parse(req.body) as never) }); } catch (error) { next(error); } });
projectRouter.post('/admin/project-templates/:id/archive', requireRole('ADMIN'), async (req, res, next) => { try { return res.json({ data: await archiveProjectTemplate(String(req.params.id)) }); } catch (error) { next(error); } });
projectRouter.post('/admin/project-assignments', requireRole('ADMIN'), async (req, res, next) => { try { return res.status(201).json({ data: await assignProject(req.auth!.user.id, assignSchema.parse(req.body)) }); } catch (error) { next(error); } });
