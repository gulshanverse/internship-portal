import { beforeEach, describe, expect, it, vi } from 'vitest';

const { taskFindFirst, taskUpdate, submissionCreate, transaction } = vi.hoisted(() => ({ taskFindFirst: vi.fn(), taskUpdate: vi.fn(), submissionCreate: vi.fn(), transaction: vi.fn() }));
vi.mock('./db', () => ({ prisma: { task: { findFirst: taskFindFirst, update: taskUpdate }, submission: { create: submissionCreate }, $transaction: transaction } }));

import { submitTask } from './project-service';

describe('task submission storage boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not persist a client-controlled file storage key', async () => {
    taskFindFirst.mockResolvedValue({ id: 'task-a', assignedTo: 'student-a', status: 'IN_PROGRESS' });
    taskUpdate.mockReturnValue({ kind: 'task-update' });
    submissionCreate.mockReturnValue({ kind: 'submission-create' });
    transaction.mockResolvedValueOnce([{ id: 'task-a' }, { id: 'submission-a' }]);

    await submitTask('student-a', 'task-a', { content: 'work', fileStorageKey: '../../student-b/private.bin' } as never);

    expect(submissionCreate).toHaveBeenCalledWith({ data: expect.not.objectContaining({ fileStorageKey: expect.anything() }) });
    expect(transaction).toHaveBeenCalled();
  });

  it('denies a task that is not assigned to the authenticated student', async () => {
    taskFindFirst.mockResolvedValue(null);
    await expect(submitTask('student-b', 'task-a', { content: 'work' })).rejects.toThrow('TASK_NOT_ASSIGNED');
    expect(transaction).not.toHaveBeenCalled();
  });
});
