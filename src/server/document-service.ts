import { randomBytes } from 'node:crypto';
import { DocumentStatus, DocumentType } from '@prisma/client';
import { prisma } from './db';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
  extensionForMime,
  generatePrivateStorageKey,
  getStorageProvider,
  isStorageConfigured,
  storageTtlSeconds,
  validateStorageKey,
} from './storage';

export function validatePrivateFile(input: { mimeType: string; sizeBytes: number }): void {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(input.mimeType)) throw new Error('DOCUMENT_TYPE_NOT_ALLOWED');
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_DOCUMENT_BYTES) throw new Error('DOCUMENT_SIZE_INVALID');
}

function requireStorage(): void {
  if (!isStorageConfigured()) throw new Error('DOCUMENT_STORAGE_NOT_CONFIGURED');
}

export async function issueDocument(adminId: string, input: { studentId: string; internshipId?: string; type: DocumentType; mimeType: string; sizeBytes: number }) {
  validatePrivateFile(input);
  requireStorage();
  const storageKey = generatePrivateStorageKey({ studentId: input.studentId, documentId: randomBytes(16).toString('hex'), extension: extensionForMime(input.mimeType) });
  const document = await prisma.document.create({ data: { studentId: input.studentId, internshipId: input.internshipId, issuedById: adminId, type: input.type, storageKey, issuedAt: new Date(), status: DocumentStatus.DRAFT } });
  await prisma.auditEvent.create({ data: { actorId: adminId, action: 'DOCUMENT_ISSUED', entity: 'Document', entityId: document.id, metadata: { type: input.type, mimeType: input.mimeType, sizeBytes: input.sizeBytes } } });
  const upload = await getStorageProvider().createUploadIntent({ key: storageKey, contentType: input.mimeType, contentLength: input.sizeBytes, expiresInSeconds: storageTtlSeconds() });
  return { documentId: document.id, status: document.status, uploadUrl: upload.uploadUrl, uploadExpiresAt: upload.expiresAt };
}

export async function listMyDocuments(userId: string) {
  return prisma.document.findMany({ where: { student: { userId }, status: DocumentStatus.PUBLISHED }, select: { id: true, type: true, issuedAt: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
}

export async function publishDocument(adminId: string, id: string) {
  const document = await prisma.document.findUnique({ where: { id }, select: { id: true, storageKey: true } });
  if (!document) throw new Error('DOCUMENT_NOT_FOUND');
  validateStorageKey(document.storageKey);
  const updated = await prisma.document.update({ where: { id }, data: { status: DocumentStatus.PUBLISHED, issuedAt: new Date() } });
  await prisma.auditEvent.create({ data: { actorId: adminId, action: 'DOCUMENT_PUBLISHED', entity: 'Document', entityId: id, metadata: {} } });
  return updated;
}

export async function revokeDocument(adminId: string, id: string) {
  const document = await prisma.document.findUnique({ where: { id }, select: { id: true } });
  if (!document) throw new Error('DOCUMENT_NOT_FOUND');
  const updated = await prisma.document.update({ where: { id }, data: { status: DocumentStatus.REVOKED } });
  await prisma.auditEvent.create({ data: { actorId: adminId, action: 'DOCUMENT_REVOKED', entity: 'Document', entityId: id, metadata: {} } });
  return updated;
}

export async function authorizeDocumentDownload(userId: string, id: string) {
  requireStorage();
  const document = await prisma.document.findFirst({ where: { id, status: DocumentStatus.PUBLISHED, student: { userId } }, select: { id: true, type: true, storageKey: true } });
  if (!document) throw new Error('DOCUMENT_NOT_FOUND');
  validateStorageKey(document.storageKey);
  const download = await getStorageProvider().createDownloadIntent({ key: document.storageKey, expiresInSeconds: storageTtlSeconds() });
  return { documentId: document.id, type: document.type, downloadUrl: download.downloadUrl, expiresAt: download.expiresAt };
}
