import { Router } from 'express';
import { z } from 'zod';
import { DocumentType } from '@prisma/client';
import { requireRole } from './middleware';
import { authorizeDocumentDownload, issueDocument, listMyDocuments, publishDocument, revokeDocument } from './document-service';

const issue = z.object({
  studentId: z.string().min(1),
  internshipId: z.string().min(1).optional(),
  type: z.nativeEnum(DocumentType),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

export const documentRouter = Router();

documentRouter.get('/student/documents', requireRole('STUDENT'), async (req, res, next) => {
  try { return res.json({ data: await listMyDocuments(req.auth!.user.id) }); } catch (error) { return next(error); }
});

documentRouter.get('/student/documents/:id/download', requireRole('STUDENT'), async (req, res, next) => {
  try { return res.json({ data: await authorizeDocumentDownload(req.auth!.user.id, String(req.params.id)) }); } catch (error) { return next(error); }
});

documentRouter.post('/admin/documents', requireRole('ADMIN'), async (req, res, next) => {
  try { return res.status(201).json({ data: await issueDocument(req.auth!.user.id, issue.parse(req.body)) }); } catch (error) { return next(error); }
});

documentRouter.post('/admin/documents/:id/publish', requireRole('ADMIN'), async (req, res, next) => {
  try { return res.json({ data: await publishDocument(req.auth!.user.id, String(req.params.id)) }); } catch (error) { return next(error); }
});

documentRouter.post('/admin/documents/:id/revoke', requireRole('ADMIN'), async (req, res, next) => {
  try { return res.json({ data: await revokeDocument(req.auth!.user.id, String(req.params.id)) }); } catch (error) { return next(error); }
});
