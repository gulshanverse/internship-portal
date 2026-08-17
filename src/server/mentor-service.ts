import { Prisma } from '@prisma/client';
import { prisma } from './db';

export async function getMentorDashboard(userId: string) {
  const [projects, sessions] = await prisma.$transaction([
    prisma.projectAssignment.findMany({ where: { mentorId: userId }, orderBy: { createdAt: 'desc' }, include: { student: true, milestones: { include: { tasks: { include: { submissions: { orderBy: { submittedAt: 'desc' }, take: 1 } } } } }, template: true } }),
    prisma.mentorshipSession.findMany({ where: { mentorId: userId }, orderBy: { scheduledAt: 'asc' }, take: 20, include: { student: true, project: true } }),
  ]);
  return { projects, sessions, pendingSubmissions: projects.flatMap(project => project.milestones.flatMap(milestone => milestone.tasks.flatMap(task => task.submissions.filter(submission => submission.status === 'IN_REVIEW')))) };
}

export async function reviewSubmission(userId: string, submissionId: string, status: 'APPROVED' | 'NEEDS_REVISION', message: string, rating?: number) {
  const submission = await prisma.submission.findFirst({ where: { id: submissionId, task: { project: { mentorId: userId } } } });
  if (!submission) throw new Error('SUBMISSION_NOT_ASSIGNED');
  return prisma.$transaction([
    prisma.submission.update({ where: { id: submissionId }, data: { status } }),
    prisma.feedback.create({ data: { submissionId, mentorId: userId, message, rating } }),
  ]);
}

export async function scheduleMentorshipSession(userId: string, input: { studentId: string; projectAssignmentId?: string; scheduledAt: Date; durationMinutes: number; notes?: string }) {
  if (input.projectAssignmentId) {
    const project = await prisma.projectAssignment.findFirst({ where: { id: input.projectAssignmentId, mentorId: userId, studentId: input.studentId } });
    if (!project) throw new Error('PROJECT_NOT_ASSIGNED');
  } else {
    const project = await prisma.projectAssignment.findFirst({ where: { mentorId: userId, student: { userId: input.studentId } } });
    if (!project) throw new Error('STUDENT_NOT_ASSIGNED');
  }
  return prisma.mentorshipSession.create({ data: { mentorId: userId, studentId: input.studentId, projectAssignmentId: input.projectAssignmentId, scheduledAt: input.scheduledAt, durationMinutes: input.durationMinutes, notes: input.notes } });
}

export async function assignMentor(adminId: string, projectAssignmentId: string, mentorId: string) {
  const project = await prisma.projectAssignment.update({ where: { id: projectAssignmentId }, data: { mentorId }, select: { id: true, mentorId: true, studentId: true } });
  await prisma.auditEvent.create({ data: { actorId: adminId, action: 'MENTOR_ASSIGNED', entity: 'ProjectAssignment', entityId: projectAssignmentId, metadata: { mentorId } } });
  return project;
}
