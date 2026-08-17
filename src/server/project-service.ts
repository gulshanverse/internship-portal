import { Prisma, ProjectStatus, SubmissionStatus, TaskStatus } from '@prisma/client';
import { prisma } from './db';

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
  const assignment = await prisma.$transaction(async tx => {
    const project = await tx.projectAssignment.create({ data: { projectTemplateId: template.id, studentId: input.studentId, mentorId: input.mentorId, applicationId: input.applicationId, title: template.title, description: template.description, startDate: input.startDate, deadline: input.deadline } });
    for (const milestoneTemplate of template.milestones) {
      const milestone = await tx.milestone.create({ data: { projectAssignmentId: project.id, title: milestoneTemplate.title, description: milestoneTemplate.description, order: milestoneTemplate.order } });
      for (const taskTemplate of milestoneTemplate.tasks) await tx.task.create({ data: { projectAssignmentId: project.id, milestoneId: milestone.id, title: taskTemplate.title, description: taskTemplate.description, priority: taskTemplate.priority, assignedTo: input.studentId } });
    }
    await tx.auditEvent.create({ data: { actorId: adminId, action: 'PROJECT_ASSIGNED', entity: 'ProjectAssignment', entityId: project.id, metadata: { studentId: input.studentId, mentorId: input.mentorId, templateId: template.id } } });
    return tx.projectAssignment.findUniqueOrThrow({ where: { id: project.id }, include: { milestones: { include: { tasks: true } } } });
  });
  return assignment;
}

async function ownedTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, assignedTo: userId, project: { student: { userId } } } });
  if (!task) throw new Error('TASK_NOT_ASSIGNED');
  return task;
}

export async function getStudentProjects(userId: string) {
  return prisma.projectAssignment.findMany({ where: { student: { userId } }, orderBy: { createdAt: 'desc' }, include: { template: { include: { domain: true } }, mentor: { select: { id: true, email: true, mentorProfile: true } }, milestones: { orderBy: { order: 'asc' }, include: { tasks: { include: { submissions: { orderBy: { submittedAt: 'desc' }, take: 1 }, feedback: true } } } } } });
}

export async function startTask(userId: string, taskId: string) { await ownedTask(userId, taskId); return prisma.task.update({ where: { id: taskId }, data: { status: TaskStatus.IN_PROGRESS } }); }

export async function submitTask(userId: string, taskId: string, input: { content?: string; repositoryUrl?: string }) {
  const task = await ownedTask(userId, taskId);
  if (!['IN_PROGRESS', 'NEEDS_REVISION'].includes(task.status)) throw new Error('TASK_NOT_SUBMITTABLE');
  return prisma.$transaction([prisma.task.update({ where: { id: taskId }, data: { status: TaskStatus.SUBMITTED } }), prisma.submission.create({ data: { taskId, studentId: task.assignedTo, content: input.content, repositoryUrl: input.repositoryUrl, status: SubmissionStatus.SUBMITTED } })]);
}
