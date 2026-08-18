import { beforeEach, describe, expect, it, vi } from 'vitest';

const { profileFindUnique, internshipFindFirst, applicationFindUnique, profileUpdate, applicationCreate, createUploadIntent, configured } = vi.hoisted(() => ({
  profileFindUnique: vi.fn(), internshipFindFirst: vi.fn(), applicationFindUnique: vi.fn(), profileUpdate: vi.fn(), applicationCreate: vi.fn(), createUploadIntent: vi.fn(), configured: vi.fn(),
}));

vi.mock('./db', () => ({ prisma: {
  studentProfile: { findUnique: profileFindUnique, update: profileUpdate },
  internship: { findFirst: internshipFindFirst },
  application: { findUnique: applicationFindUnique, create: applicationCreate },
} }));

vi.mock('./storage', () => ({
  extensionForMime: () => 'pdf',
  generatePrivateStorageKey: vi.fn(() => 'private/documents/student-profile/resume-012345678901234567890123456789012345678901234567.pdf'),
  getStorageProvider: () => ({ createUploadIntent }),
  isStorageConfigured: configured,
  storageTtlSeconds: () => 300,
  validateStorageKey: vi.fn(),
}));

import { createApplication, validateResume } from './application-service';

describe('resume storage boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('validates resume metadata without accepting a storage key as authoritative input', () => {
    expect(() => validateResume({ filename: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 100 })).not.toThrow();
    expect(() => validateResume({ filename: '../resume.pdf', mimeType: 'application/pdf', sizeBytes: 100 })).not.toThrow();
    expect(() => validateResume({ filename: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 5 * 1024 * 1024 + 1 })).toThrow('RESUME_SIZE_INVALID');
    expect(() => validateResume({ filename: 'resume.exe', mimeType: 'application/x-executable', sizeBytes: 100 })).toThrow('RESUME_TYPE_NOT_ALLOWED');
  });

  it('generates the authoritative key server-side and returns only an upload intent', async () => {
    configured.mockReturnValue(true);
    profileFindUnique.mockResolvedValue({ id: 'student-profile-a' });
    internshipFindFirst.mockResolvedValue({ id: 'internship-a' });
    applicationFindUnique.mockResolvedValue(null);
    profileUpdate.mockResolvedValue({ id: 'student-profile-a' });
    applicationCreate.mockResolvedValue({ id: 'application-a', status: 'DRAFT', internship: { id: 'internship-a' } });
    createUploadIntent.mockResolvedValue({ uploadUrl: 'https://storage.test/upload', expiresAt: new Date('2026-08-18T00:05:00Z') });

    const result = await createApplication('user-a', {
      internshipId: 'internship-a',
      skills: ['TypeScript'],
      resume: { filename: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: '../../student-b/private.pdf' } as never,
    });

    expect(result.resumeUpload?.uploadUrl).toBe('https://storage.test/upload');
    expect(result).not.toHaveProperty('storageKey');
    expect(profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resumeStorageKey: expect.stringMatching(/^private\//) }) }));
    expect(createUploadIntent).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^private\//), contentType: 'application/pdf', contentLength: 100 }));
  });

  it('blocks resume creation when private storage is not configured', async () => {
    configured.mockReturnValue(false);
    profileFindUnique.mockResolvedValue({ id: 'student-profile-a' });
    internshipFindFirst.mockResolvedValue({ id: 'internship-a' });
    await expect(createApplication('user-a', { internshipId: 'internship-a', skills: ['TypeScript'], resume: { filename: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 100 } })).rejects.toThrow('RESUME_STORAGE_NOT_CONFIGURED');
    expect(applicationCreate).not.toHaveBeenCalled();
  });
});
