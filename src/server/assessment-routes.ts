import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './middleware';
import { archiveQuestion, createAssessment, createQuestion, getAssessmentForStudent, saveAnswer, startAttempt, submitAttempt, updateAssessment, updateQuestion } from './assessment-service';

const answerSchema = z.object({ answer: z.unknown() });
const questionSchema = z.object({ assessmentId: z.string().min(1), domainId: z.string().min(1).optional(), question: z.string().trim().min(5).max(5000), type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TEXT', 'CODE']), options: z.unknown().optional(), correctAnswer: z.unknown().optional(), explanation: z.string().max(3000).optional(), difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(), marks: z.number().int().positive().max(100).optional(), timeLimitSeconds: z.number().int().positive().max(3600).optional() });
const assessmentSchema = z.object({ internshipId: z.string().min(1), title: z.string().trim().min(3).max(200), description: z.string().trim().min(10).max(3000), durationMinutes: z.number().int().positive().max(600).optional(), passingScore: z.number().int().min(0).max(100), attemptsAllowed: z.number().int().positive().max(10).optional() });

export const assessmentRouter = Router();

assessmentRouter.get('/assessments/:assessmentId', requireRole('STUDENT'), async (req, res, next) => { try { const data = await getAssessmentForStudent(req.auth!.user.id, String(req.params.assessmentId), String(req.query.applicationId ?? '')); return res.json({ data }); } catch (error) { next(error); } });
assessmentRouter.post('/assessments/:assessmentId/start', requireRole('STUDENT'), async (req, res, next) => { try { const data = await startAttempt(req.auth!.user.id, String(req.params.assessmentId), z.object({ applicationId: z.string().min(1) }).parse(req.body).applicationId); return res.status(201).json({ data }); } catch (error) { next(error); } });
assessmentRouter.post('/assessment-attempts/:attemptId/answers/:questionId', requireRole('STUDENT'), async (req, res, next) => { try { const data = await saveAnswer(req.auth!.user.id, String(req.params.attemptId), String(req.params.questionId), answerSchema.parse(req.body).answer); return res.json({ data: { id: data.id, saved: true } }); } catch (error) { next(error); } });
assessmentRouter.post('/assessment-attempts/:attemptId/submit', requireRole('STUDENT'), async (req, res, next) => { try { const data = await submitAttempt(req.auth!.user.id, String(req.params.attemptId)); return res.json({ data }); } catch (error) { next(error); } });

assessmentRouter.post('/admin/assessments', requireRole('ADMIN'), async (req, res, next) => { try { return res.status(201).json({ data: await createAssessment(assessmentSchema.parse(req.body)) }); } catch (error) { next(error); } });
assessmentRouter.patch('/admin/assessments/:id', requireRole('ADMIN'), async (req, res, next) => { try { return res.json({ data: await updateAssessment(String(req.params.id), assessmentSchema.partial().parse(req.body)) }); } catch (error) { next(error); } });
assessmentRouter.post('/admin/questions', requireRole('ADMIN'), async (req, res, next) => { try { const input = questionSchema.parse(req.body) as Parameters<typeof createQuestion>[0]; return res.status(201).json({ data: await createQuestion(input) }); } catch (error) { next(error); } });
assessmentRouter.patch('/admin/questions/:id', requireRole('ADMIN'), async (req, res, next) => { try { return res.json({ data: await updateQuestion(String(req.params.id), questionSchema.partial().parse(req.body) as Record<string, unknown>) }); } catch (error) { next(error); } });
assessmentRouter.post('/admin/questions/:id/archive', requireRole('ADMIN'), async (req, res, next) => { try { return res.json({ data: await archiveQuestion(String(req.params.id)) }); } catch (error) { next(error); } });
