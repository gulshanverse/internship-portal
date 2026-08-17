import { prisma } from './db';

export async function getStudentDashboard(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId }, include: { user: { select: { id: true, email: true, role: true } } } });
  if (!profile) throw new Error('STUDENT_PROFILE_REQUIRED');
  const [applications, projects, notifications, documents] = await prisma.$transaction([
    prisma.application.findMany({ where: { studentId: profile.id }, orderBy: { createdAt: 'desc' }, include: { internship: { include: { domain: true } }, attempts: { select: { id: true, status: true, percentage: true, passed: true, submittedAt: true }, orderBy: { startedAt: 'desc' }, take: 1 } } }),
    prisma.projectAssignment.findMany({ where: { studentId: profile.id }, orderBy: { createdAt: 'desc' }, include: { mentor: { select: { id: true, email: true, mentorProfile: true } }, milestones: { orderBy: { order: 'asc' }, include: { tasks: { orderBy: { createdAt: 'asc' } } } } } }),
    prisma.notification.findMany({ where: { userId, }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.document.findMany({ where: { studentId: profile.id, status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' }, select: { id: true, type: true, issuedAt: true, status: true, createdAt: true } }),
  ]);
  const currentApplication = applications.find(application => ['SELECTED', 'ONBOARDING', 'ACTIVE'].includes(application.status)) ?? applications[0] ?? null;
  const currentProject = projects.find(project => project.status !== 'COMPLETED' && project.status !== 'ARCHIVED') ?? projects[0] ?? null;
  const nextTask = currentProject?.milestones.flatMap(milestone => milestone.tasks).find(task => !['COMPLETED', 'APPROVED'].includes(task.status)) ?? null;
  return { profile, currentApplication, applications, currentProject, projects, nextTask, notifications, documents };
}
