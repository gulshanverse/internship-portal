import { randomBytes } from 'node:crypto';
import { Prisma, ProjectStatus, SubmissionStatus, TaskStatus } from '@prisma/client';
import { prisma } from './db';
import { ALLOWED_TASK_ATTACHMENT_MIME_TYPES, extensionForMime, generatePrivateStorageKey, getStorageProvider, isStorageConfigured, MAX_TASK_ATTACHMENT_BYTES, storageTtlSeconds, validateStorageKey } from './storage';

export async function listProjectTemplates(includeInactive = false) {
  return prisma.projectTemplate.findMany({ where: includeInactive ? undefined : { active: true }, orderBy: { updatedAt: 'desc' }, include: { domain: true, milestones: { orderBy: { order: 'asc' }, include: { tasks: { orderBy: { order: 'asc' } } } } } });
}

export async function createProjectTemplate(input: Prisma.ProjectTemplateUncheckedCreateInput) {
  return prisma.projectTemplate.create({ data: input, include: { domain: true, milestones: true } });
}

export async function updateProjectTemplate(id: string, data: Prisma.ProjectTemplateUpdateInput) {
  return prisma.projectTemplate.update({ where: { id }, data });
}

export async function archiveProjectTemplate(id: string) {
  return prisma.projectTemplate.update({ where: { id }, data: { active: false } });
}

export async function assignProject(adminId: string, input: { projectTemplateId: string; studentId: string; mentorId: string; applicationId: string; startDate: Date; deadline: Date }) {
  const template = await prisma.projectTemplate.findFirst({ where: { id: input.projectTemplateId, active: true }, include: { milestones: { include: { tasks: true }, orderBy: { order: 'asc' } } } });
  if (!template) throw new Error('PROJECT_TEMPLATE_NOT_AVAILABLE');
  return prisma.$transaction(async tx => {
    const project = await tx.projectAssignment.create({ data: { projectTemplateId: template.id, studentId: input.studentId, mentorId: input.mentorId, applicationId: input.applicationId, title: template.title, description: template.description, startDate: input.startDate, deadline: input.deadline } });
    for (const milestoneTemplate of template.milestones) {
      const milestone = await tx.milestone.create({ data: { projectAssignmentId: project.id, title: milestoneTemplate.title, description: milestoneTemplate.description, order: milestoneTemplate.order } });
      for (const taskTemplate of milestoneTemplate.tasks) await tx.task.create({ data: { projectAssignmentId: project.id, milestoneId: milestone.id, title: taskTemplate.title, description: taskTemplate.description, priority: taskTemplate.priority, assignedTo: input.studentId } });
    }
    await tx.auditEvent.create({ data: { actorId: adminId, action: 'PROJECT_ASSIGNED', entity: 'ProjectAssignment', entityId: project.id, metadata: { studentId: input.studentId, mentorId: input.mentorId, templateId: template.id } } });
    return tx.projectAssignment.findUniqueOrThrow({ where: { id: project.id }, include: { milestones: { include: { tasks: true } } } });
  });
}

async function ownedTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, assignedTo: userId, project: { student: { userId } } } });
  if (!task) throw new Error('TASK_NOT_ASSIGNED');
  return task;
}

export function validateTaskAttachment(input: { filename: string; mimeType: string; sizeBytes: number }): void {
  if (!/^[^/\\]{1,200}$/.test(input.filename) || input.filename.includes('..')) throw new Error('TASK_ATTACHMENT_FILENAME_INVALID');
  if (!ALLOWED_TASK_ATTACHMENT_MIME_TYPES.has(input.mimeType)) throw new Error('TASK_ATTACHMENT_MIME_INVALID');
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_TASK_ATTACHMENT_BYTES) throw new Error('TASK_ATTACHMENT_SIZE_INVALID');
}

export async function createTaskAttachmentUploadIntent(userId: string, taskId: string, input: { filename: string; mimeType: string; sizeBytes: number }) {
  const task = await ownedTask(userId, taskId);
  validateTaskAttachment(input);
  if (!isStorageConfigured()) throw new Error('TASK_ATTACHMENT_STORAGE_NOT_CONFIGURED');
  const storageKey = generatePrivateStorageKey({ namespace: 'task-attachments', studentId: task.assignedTo, documentId: `${taskId}-${randomBytes(8).toString('hex')}`, extension: extensionForMime(input.mimeType) });
  const expiresAt = new Date(Date.now() + storageTtlSeconds() * 1000);
  const intent = await prisma.taskAttachmentIntent.create({ data: { taskId, studentId: task.assignedTo, storageKey, fileName: input.filename, fileMimeType: input.mimeType, fileSizeBytes: input.sizeBytes, expiresAt } });
  await prisma.auditEvent.create({ data: { actorId: userId, action: 'TASK_ATTACHMENT_UPLOAD_INTENT_ISSUED', entity: 'TaskAttachmentIntent', entityId: intent.id, metadata: { taskId, mimeType: input.mimeType, sizeBytes: input.sizeBytes } } });
  const upload = await getStorageProvider().createUploadIntent({ key: storageKey, contentType: input.mimeType, contentLength: input.sizeBytes, expiresInSeconds: storageTtlSeconds() });
  return { intentId: intent.id, uploadUrl: upload.uploadUrl, uploadExpiresAt: upload.expiresAt };
}

export async function getStudentProjects(userId: string) {
  return prisma.projectAssignment.findMany({ where: { student: { userId } }, orderBy: { createdAt: 'desc' }, include: { template: { include: { domain: true } }, mentor: { select: { id: true, email: true, mentorProfile: true } }, milestones: { orderBy: { order: 'asc' }, include: { tasks: { include: { submissions: { orderBy: { submittedAt: 'desc' }, take: 1, select: { id: true, content: true, repositoryUrl: true, fileName: true, fileMimeType: true, fileSizeBytes: true, submittedAt: true, status: true, feedback: true } }, feedback: true } } } } } });
}

export async function startTask(userId: string, taskId: string) { await ownedTask(userId, taskId); return prisma.task.update({ where: { id: taskId }, data: { status: TaskStatus.IN_PROGRESS } }); }

export async function submitTask(userId: string, taskId: string, input: { content?: string; repositoryUrl?: string; attachmentIntentId?: string }) {
  const task = await ownedTask(userId, taskId);
  if (!['IN_PROGRESS', 'NEEDS_REVISION'].includes(task.status)) throw new Error('TASK_NOT_SUBMITTABLE');
  const intent = input.attachmentIntentId ? await prisma.taskAttachmentIntent.findFirst({ where: { id: input.attachmentIntentId, taskId, studentId: task.assignedTo, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }) : null;
  if (input.attachmentIntentId && !intent) throw new Error('TASK_ATTACHMENT_INTENT_INVALID');
  if (intent) validateStorageKey(intent.storageKey);
  return prisma.$transaction(async tx => {
    const submission = await tx.submission.create({ data: { taskId, studentId: task.assignedTo, content: input.content, repositoryUrl: input.repositoryUrl, fileStorageKey: intent?.storageKey, fileName: intent?.fileName, fileMimeType: intent?.fileMimeType, fileSizeBytes: intent?.fileSizeBytes, status: SubmissionStatus.SUBMITTED } });
    await tx.task.update({ where: { id: taskId }, data: { status: TaskStatus.SUBMITTED } });
    if (intent) await tx.taskAttachmentIntent.update({ where: { id: intent.id }, data: { consumedAt: new Date() } });
    return submission;
  });
}

export async function authorizeTaskAttachmentDownload(userId: string, role: 'STUDENT' | 'MENTOR' | 'ADMIN', submissionId: string) {
  if (!isStorageConfigured()) throw new Error('TASK_ATTACHMENT_STORAGE_NOT_CONFIGURED');
  const submission = await prisma.submission.findFirst({ where: { id: submissionId, fileStorageKey: { not: null }, attachmentRevokedAt: null, ...(role === 'ADMIN' ? {} : role === 'STUDENT' ? { student: { userId } } : { task: { project: { mentorId: userId } } }) }, select: { id: true, taskId: true, fileStorageKey: true, fileName: true, fileMimeType: true } });
  if (!submission?.fileStorageKey) throw new Error('TASK_ATTACHMENT_NOT_FOUND');
  validateStorageKey(submission.fileStorageKey);
  const download = await getStorageProvider().createDownloadIntent({ key: submission.fileStorageKey, expiresInSeconds: storageTtlSeconds() });
  await prisma.auditEvent.create({ data: { actorId: userId, action: 'TASK_ATTACHMENT_DOWNLOAD_INTENT_ISSUED', entity: 'Submission', entityId: submission.id, metadata: { taskId: submission.taskId, role } } });
  return { submissionId: submission.id, fileName: submission.fileName, mimeType: submission.fileMimeType, downloadUrl: download.downloadUrl, expiresAt: download.expiresAt };
}

export async function revokeTaskAttachment(actorId: string, submissionId: string) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId }, select: { id: true, fileStorageKey: true } });
  if (!submission) throw new Error('TASK_ATTACHMENT_NOT_FOUND');
  const updated = await prisma.submission.update({ where: { id: submissionId }, data: { attachmentRevokedAt: new Date() }, select: { id: true, attachmentRevokedAt: true } });
  await prisma.auditEvent.create({ data: { actorId, action: 'TASK_ATTACHMENT_REVOKED', entity: 'Submission', entityId: submissionId, metadata: {} } });
  return updated;
}
