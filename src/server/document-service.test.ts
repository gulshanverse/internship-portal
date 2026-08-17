import { describe, expect, it, vi } from 'vitest';

const findFirst = vi.fn();
const findUnique = vi.fn();
const documentCreate = vi.fn();
const documentUpdate = vi.fn();
const auditCreate = vi.fn();
const createDownloadIntent = vi.fn();
const createUploadIntent = vi.fn();

vi.mock('./db', () => ({
  prisma: {
    document: { findFirst, findUnique, create: documentCreate, update: documentUpdate },
    auditEvent: { create: auditCreate },
  },
}));

vi.mock('./storage', () => ({
  ALLOWED_DOCUMENT_MIME_TYPES: new Set(['application/pdf']),
  MAX_DOCUMENT_BYTES: 10 * 1024 * 1024,
  extensionForMime: () => 'pdf',
  generatePrivateStorageKey: () => 'private/documents/student-a/doc-a-012345678901234567890123456789012345678901234567.pdf',
  getStorageProvider: () => ({ createDownloadIntent, createUploadIntent }),
  isStorageConfigured: () => true,
  storageTtlSeconds: () => 300,
  validateStorageKey: () => undefined,
}));

const { authorizeDocumentDownload } = await import('./document-service');

describe('document authorization boundary', () => {
  it('does not issue an intent for another student document', async () => {
    findFirst.mockResolvedValueOnce(null);
    await expect(authorizeDocumentDownload('student-b', 'doc-a')).rejects.toThrow('DOCUMENT_NOT_FOUND');
    expect(createDownloadIntent).not.toHaveBeenCalled();
  });

  it('issues an intent only after ownership and publication filters pass', async () => {
    findFirst.mockResolvedValueOnce({ id: 'doc-a', type: 'CERTIFICATE', storageKey: 'private/documents/student-a/doc-a-012345678901234567890123456789012345678901234567.pdf' });
    createDownloadIntent.mockResolvedValueOnce({ key: 'private/documents/student-a/doc-a-012345678901234567890123456789012345678901234567.pdf', downloadUrl: 'https://storage.test/signed', expiresAt: new Date('2026-08-18T00:05:00Z') });
    const result = await authorizeDocumentDownload('student-a', 'doc-a');
    expect(result.downloadUrl).toBe('https://storage.test/signed');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'doc-a', status: 'PUBLISHED', student: { userId: 'student-a' } }) }));
  });
});
