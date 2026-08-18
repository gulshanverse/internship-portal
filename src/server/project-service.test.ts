import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  taskFindFirst: vi.fn(),
  taskUpdate: vi.fn(),
  submissionCreate: vi.fn(),
  submissionFindFirst: vi.fn(),
  submissionFindUnique: vi.fn(),
  submissionUpdate: vi.fn(),
  intentCreate: vi.fn(),
  intentFindFirst: vi.fn(),
  intentUpdate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  createUploadIntent: vi.fn(),
  createDownloadIntent: vi.fn(),
  storageConfigured: vi.fn(),
}));

vi.mock('./db', () => ({ prisma: {
  task: { findFirst: mocks.taskFindFirst, update: mocks.taskUpdate },
  submission: { create: mocks.submissionCreate, findFirst: mocks.submissionFindFirst, findUnique: mocks.submissionFindUnique, update: mocks.submissionUpdate },
  taskAttachmentIntent: { create: mocks.intentCreate, findFirst: mocks.intentFindFirst, update: mocks.intentUpdate },
  auditEvent: { create: mocks.auditCreate },
  $transaction: mocks.transaction,
} }));
vi.mock('./storage', async () => {
  const actual = await vi.importActual<typeof import('./storage')>('./storage');
  return { ...actual, isStorageConfigured: mocks.storageConfigured, getStorageProvider: () => ({ createUploadIntent: mocks.createUploadIntent, createDownloadIntent: mocks.createDownloadIntent }) };
});

import { authorizeTaskAttachmentDownload, createTaskAttachmentUploadIntent, submitTask, validateTaskAttachment } from './project-service';

describe('task attachment security boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageConfigured.mockReturnValue(true);
    mocks.createUploadIntent.mockResolvedValue({ uploadUrl: 'https://storage.test/upload', expiresAt: new Date('2030-01-01T00:05:00Z') });
    mocks.createDownloadIntent.mockResolvedValue({ downloadUrl: 'https://storage.test/download', expiresAt: new Date('2030-01-01T00:05:00Z') });
    mocks.auditCreate.mockResolvedValue({ id: 'audit-a' });
  });

  it('validates filename, MIME, and size without accepting traversal paths', () => {
    expect(() => validateTaskAttachment({ filename: 'deliverable.pdf', mimeType: 'application/pdf', sizeBytes: 100 })).not.toThrow();
    expect(() => validateTaskAttachment({ filename: '../student-b.zip', mimeType: 'application/zip', sizeBytes: 100 })).toThrow('TASK_ATTACHMENT_FILENAME_INVALID');
    expect(() => validateTaskAttachment({ filename: 'deliverable.exe', mimeType: 'application/x-msdownload', sizeBytes: 100 })).toThrow('TASK_ATTACHMENT_MIME_INVALID');
    expect(() => validateTaskAttachment({ filename: 'deliverable.pdf', mimeType: 'application/pdf', sizeBytes: 20 * 1024 * 1024 + 1 })).toThrow('TASK_ATTACHMENT_SIZE_INVALID');
  });

  it('issues an upload intent only for the authenticated student-owned task', async () => {
    mocks.taskFindFirst.mockResolvedValue({ id: 'task-a', assignedTo: 'student-a', status: 'IN_PROGRESS' });
    mocks.intentCreate.mockResolvedValue({ id: 'intent-a' });
    const result = await createTaskAttachmentUploadIntent('student-a', 'task-a', { filename: 'deliverable.pdf', mimeType: 'application/pdf', sizeBytes: 100 });
    expect(result).toHaveProperty('intentId', 'intent-a');
    expect(mocks.intentCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ taskId: 'task-a', studentId: 'student-a', storageKey: expect.stringMatching(/^private\/task-attachments\/student-a\//) }) });
    expect(mocks.createUploadIntent).toHaveBeenCalled();
  });

  it('denies an attachment intent for another student task', async () => {
    mocks.taskFindFirst.mockResolvedValue(null);
    await expect(createTaskAttachmentUploadIntent('student-b', 'task-a', { filename: 'deliverable.pdf', mimeType: 'application/pdf', sizeBytes: 100 })).rejects.toThrow('TASK_NOT_ASSIGNED');
    expect(mocks.intentCreate).not.toHaveBeenCalled();
  });

  it('consumes a valid server-issued intent and ignores arbitrary client storage paths', async () => {
    mocks.taskFindFirst.mockResolvedValue({ id: 'task-a', assignedTo: 'student-a', status: 'IN_PROGRESS' });
    mocks.intentFindFirst.mockResolvedValue({ id: 'intent-a', storageKey: 'private/task-attachments/student-a/task-a-random.pdf', fileName: 'deliverable.pdf', fileMimeType: 'application/pdf', fileSizeBytes: 100 });
    mocks.submissionCreate.mockResolvedValue({ id: 'submission-a' });
    mocks.taskUpdate.mockResolvedValue({ id: 'task-a' });
    mocks.intentUpdate.mockResolvedValue({ id: 'intent-a' });
    mocks.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({ submission: { create: mocks.submissionCreate }, task: { update: mocks.taskUpdate }, taskAttachmentIntent: { update: mocks.intentUpdate } }));
    await submitTask('student-a', 'task-a', { attachmentIntentId: 'intent-a', fileStorageKey: '../../student-b/private.pdf' } as never);
    expect(mocks.submissionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ fileStorageKey: 'private/task-attachments/student-a/task-a-random.pdf', fileName: 'deliverable.pdf' }) });
    expect(mocks.submissionCreate.mock.calls[0][0].data.fileStorageKey).not.toContain('student-b');
    expect(mocks.intentUpdate).toHaveBeenCalled();
  });

  it('denies expired or unknown attachment intents', async () => {
    mocks.taskFindFirst.mockResolvedValue({ id: 'task-a', assignedTo: 'student-a', status: 'IN_PROGRESS' });
    mocks.intentFindFirst.mockResolvedValue(null);
    await expect(submitTask('student-a', 'task-a', { attachmentIntentId: 'expired-intent' })).rejects.toThrow('TASK_ATTACHMENT_INTENT_INVALID');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('allows only the assigned mentor or admin/student owner to obtain a download intent', async () => {
    mocks.submissionFindFirst.mockResolvedValue({ id: 'submission-a', taskId: 'task-a', fileStorageKey: 'private/task-attachments/student-a/task-a-random.pdf', fileName: 'deliverable.pdf', fileMimeType: 'application/pdf' });
    const result = await authorizeTaskAttachmentDownload('mentor-a', 'MENTOR', 'submission-a');
    expect(result.downloadUrl).toBe('https://storage.test/download');
    expect(mocks.submissionFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ task: { project: { mentorId: 'mentor-a' } } }) }));
  });

  it('denies a student download when the submission is not owned by that student', async () => {
    mocks.submissionFindFirst.mockResolvedValue(null);
    await expect(authorizeTaskAttachmentDownload('student-b', 'STUDENT', 'submission-a')).rejects.toThrow('TASK_ATTACHMENT_NOT_FOUND');
  });

  it('never creates a download intent for a revoked attachment', async () => {
    mocks.submissionFindFirst.mockResolvedValue(null);
    await expect(authorizeTaskAttachmentDownload('admin-a', 'ADMIN', 'submission-a')).rejects.toThrow('TASK_ATTACHMENT_NOT_FOUND');
    expect(mocks.createDownloadIntent).not.toHaveBeenCalled();
  });
});
