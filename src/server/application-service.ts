import crypto from 'node:crypto';
import { ApplicationStatus } from '@prisma/client';
import { prisma } from './db';

export type ResumeInput = { storageKey: string; filename: string; mimeType: string; sizeBytes: number };

const allowedResumeTypes = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const maxResumeBytes = 5 * 1024 * 1024;

export function validateResume(resume: ResumeInput) {
  if (!allowedResumeTypes.has(resume.mimeType)) throw new Error('RESUME_TYPE_NOT_ALLOWED');
  if (resume.sizeBytes <= 0 || resume.sizeBytes > maxResumeBytes) throw new Error('RESUME_SIZE_INVALID');
  if (!/^[a-zA-Z0-9._/-]+$/.test(resume.storageKey) || resume.storageKey.includes('..')) throw new Error('RESUME_STORAGE_KEY_INVALID');
}

function publicApplicationId() {
  return `APP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function getStudentProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error('STUDENT_PROFILE_REQUIRED');
  return profile;
}

export async function createApplication(userId: string, input: { internshipId: string; skills: string[]; phone?: string; college?: string; course?: string; graduationYear?: number; bio?: string; linkedinUrl?: string; githubUrl?: string; portfolioUrl?: string; resume?: ResumeInput }) {
  const profile = await getStudentProfile(userId);
  const internship = await prisma.internship.findFirst({ where: { id: input.internshipId, published: true, archived: false } });
  if (!internship) throw new Error('INTERNSHIP_NOT_AVAILABLE');
  if (input.resume) validateResume(input.resume);
  const existing = await prisma.application.findUnique({ where: { studentId_internshipId: { studentId: profile.id, internshipId: internship.id } } });
  if (existing) throw new Error('DUPLICATE_APPLICATION');
  const updatedProfile = await prisma.studentProfile.update({ where: { id: profile.id }, data: { phone: input.phone, college: input.college, course: input.course, graduationYear: input.graduationYear, bio: input.bio, skills: input.skills, linkedinUrl: input.linkedinUrl, githubUrl: input.githubUrl, portfolioUrl: input.portfolioUrl, resumeStorageKey: input.resume?.storageKey, profileCompletion: 100 } });
  const application = await prisma.application.create({ data: { publicId: publicApplicationId(), studentId: updatedProfile.id, internshipId: internship.id, resumeStorageKey: input.resume?.storageKey, status: ApplicationStatus.DRAFT }, include: { internship: { include: { domain: true } } } });
  return application;
}

export async function listMyApplications(userId: string) {
  const profile = await getStudentProfile(userId);
  return prisma.application.findMany({ where: { studentId: profile.id }, orderBy: { createdAt: 'desc' }, include: { internship: { include: { domain: true } }, attempts: { select: { id: true, status: true, percentage: true, passed: true, submittedAt: true }, orderBy: { startedAt: 'desc' }, take: 1 } } });
}

export async function getMyApplication(userId: string, publicId: string) {
  const profile = await getStudentProfile(userId);
  return prisma.application.findFirst({ where: { publicId, studentId: profile.id }, include: { internship: { include: { domain: true } }, attempts: { select: { id: true, status: true, percentage: true, passed: true, submittedAt: true } } } });
}

export async function submitMyApplication(userId: string, publicId: string) {
  const profile = await getStudentProfile(userId);
  const application = await prisma.application.findFirst({ where: { publicId, studentId: profile.id }, include: { internship: { include: { assessments: { where: { active: true }, select: { id: true } } } } } });
  if (!application) throw new Error('APPLICATION_NOT_FOUND');
  if (application.status !== ApplicationStatus.DRAFT) throw new Error('INVALID_APPLICATION_STATE');
  const nextStatus = application.internship.assessments.length > 0 ? ApplicationStatus.ASSESSMENT_PENDING : ApplicationStatus.SUBMITTED;
  return prisma.application.update({ where: { id: application.id }, data: { status: nextStatus, submittedAt: new Date() }, include: { internship: { include: { domain: true } } } });
}
