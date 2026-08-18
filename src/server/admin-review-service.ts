import { ApplicationStatus } from '@prisma/client';
import { prisma } from './db';

const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: [ApplicationStatus.SUBMITTED, ApplicationStatus.REJECTED],
  SUBMITTED: [ApplicationStatus.ASSESSMENT_PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
  ASSESSMENT_PENDING: [ApplicationStatus.ASSESSMENT_COMPLETED, ApplicationStatus.REJECTED],
  ASSESSMENT_COMPLETED: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
  UNDER_REVIEW: [ApplicationStatus.SHORTLISTED, ApplicationStatus.INTERVIEW, ApplicationStatus.SELECTED, ApplicationStatus.REJECTED],
  SHORTLISTED: [ApplicationStatus.INTERVIEW, ApplicationStatus.SELECTED, ApplicationStatus.REJECTED],
  INTERVIEW: [ApplicationStatus.SELECTED, ApplicationStatus.REJECTED],
  SELECTED: [ApplicationStatus.ONBOARDING, ApplicationStatus.REJECTED],
  REJECTED: [],
  ONBOARDING: [ApplicationStatus.ACTIVE, ApplicationStatus.REJECTED],
  ACTIVE: [ApplicationStatus.COMPLETED],
  COMPLETED: [],
};

export async function listApplications(input: { page?: number; pageSize?: number; status?: ApplicationStatus; domainId?: string; internshipId?: string; search?: string }) {
  const page = Math.max(1, input.page ?? 1); const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const where = { ...(input.status ? { status: input.status } : {}), ...(input.domainId ? { internship: { domainId: input.domainId } } : {}), ...(input.internshipId ? { internshipId: input.internshipId } : {}), ...(input.search ? { student: { fullName: { contains: input.search, mode: 'insensitive' as const } } } : {}) };
  const [data, total] = await prisma.$transaction([
    prisma.application.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { student: { select: { id: true, fullName: true, college: true, course: true, graduationYear: true, skills: true, linkedinUrl: true, githubUrl: true, portfolioUrl: true, resumeStorageKey: true } }, internship: { include: { domain: true } }, attempts: { select: { id: true, percentage: true, passed: true, submittedAt: true, status: true }, orderBy: { startedAt: 'desc' }, take: 1 } } }),
    prisma.application.count({ where }),
  ]);
  const safeData = data.map(({ student, ...application }) => {
    const { resumeStorageKey: _resumeStorageKey, ...safeStudent } = student;
    return { ...application, student: safeStudent };
  });
  return { data: safeData, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function getApplicationDetail(id: string) {
  const application = await prisma.application.findUnique({ where: { id }, include: { student: true, internship: { include: { domain: true, assessments: { select: { id: true, title: true } } } }, attempts: { select: { id: true, score: true, percentage: true, passed: true, status: true, submittedAt: true, answers: { select: { questionId: true, marks: true, isCorrect: true } } } }, reviewer: { select: { id: true, email: true, role: true } } } });
  if (!application) return null;
  const { resumeStorageKey: _resumeStorageKey, student, ...safeApplication } = application;
  const { resumeStorageKey: _studentResumeStorageKey, ...safeStudent } = student;
  return { ...safeApplication, student: safeStudent };
}

export async function transitionApplication(applicationId: string, reviewerId: string, toStatus: ApplicationStatus, notes?: string) {
  const application = await prisma.application.findUnique({ where: { id: applicationId }, select: { status: true, studentId: true, internshipId: true } });
  if (!application) throw new Error('APPLICATION_NOT_FOUND');
  if (!allowedTransitions[application.status].includes(toStatus)) throw new Error('INVALID_APPLICATION_TRANSITION');
  const updated = await prisma.application.update({ where: { id: applicationId }, data: { status: toStatus, reviewerId, reviewedAt: new Date(), notes }, include: { student: { select: { userId: true } }, internship: { select: { title: true } } } });
  await prisma.auditEvent.create({ data: { actorId: reviewerId, action: `APPLICATION_STATUS_${toStatus}`, entity: 'Application', entityId: applicationId, metadata: { fromStatus: application.status, toStatus, studentId: application.studentId, internshipId: application.internshipId } } });
  return updated;
}

export async function addApplicationNote(applicationId: string, reviewerId: string, notes: string) {
  const updated = await prisma.application.update({ where: { id: applicationId }, data: { notes, reviewerId, reviewedAt: new Date() } });
  await prisma.auditEvent.create({ data: { actorId: reviewerId, action: 'APPLICATION_NOTE_ADDED', entity: 'Application', entityId: applicationId, metadata: { noteLength: notes.length } } });
  return updated;
}
