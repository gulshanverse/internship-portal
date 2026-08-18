import crypto from 'node:crypto';
import { ApplicationStatus } from '@prisma/client';
import { prisma } from './db';
import { extensionForMime, generatePrivateStorageKey, getStorageProvider, isStorageConfigured, storageTtlSeconds, validateStorageKey } from './storage';

export type ResumeInput = { filename: string; mimeType: string; sizeBytes: number };

type ApplicationWithResumeKey = { resumeStorageKey?: string | null; [key: string]: unknown };
function withoutResumeStorageKey<T extends ApplicationWithResumeKey>(application: T): Omit<T, 'resumeStorageKey'> {
  const { resumeStorageKey: _resumeStorageKey, ...safeApplication } = application;
  return safeApplication;
}

const allowedResumeTypes = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const maxResumeBytes = 5 * 1024 * 1024;

export function validateResume(resume: ResumeInput) {
  if (!resume.filename.trim() || resume.filename.length > 255) throw new Error('RESUME_FILENAME_INVALID');
  if (!allowedResumeTypes.has(resume.mimeType)) throw new Error('RESUME_TYPE_NOT_ALLOWED');
  if (!Number.isInteger(resume.sizeBytes) || resume.sizeBytes <= 0 || resume.sizeBytes > maxResumeBytes) throw new Error('RESUME_SIZE_INVALID');
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
  if (input.resume) {
    validateResume(input.resume);
    if (!isStorageConfigured()) throw new Error('RESUME_STORAGE_NOT_CONFIGURED');
  }
  const existing = await prisma.application.findUnique({ where: { studentId_internshipId: { studentId: profile.id, internshipId: internship.id } } });
  if (existing) throw new Error('DUPLICATE_APPLICATION');

  const resumeKey = input.resume ? generatePrivateStorageKey({ studentId: profile.id, documentId: `resume-${crypto.randomBytes(16).toString('hex')}`, extension: extensionForMime(input.resume.mimeType) }) : undefined;
  const updatedProfile = await prisma.studentProfile.update({ where: { id: profile.id }, data: { phone: input.phone, college: input.college, course: input.course, graduationYear: input.graduationYear, bio: input.bio, skills: input.skills, linkedinUrl: input.linkedinUrl, githubUrl: input.githubUrl, portfolioUrl: input.portfolioUrl, resumeStorageKey: resumeKey, profileCompletion: 100 } });
  const application = await prisma.application.create({ data: { publicId: publicApplicationId(), studentId: updatedProfile.id, internshipId: internship.id, resumeStorageKey: resumeKey, status: ApplicationStatus.DRAFT }, include: { internship: { include: { domain: true } } } });
  if (!resumeKey || !input.resume) return { application: withoutResumeStorageKey(application as unknown as ApplicationWithResumeKey), resumeUpload: null };
  const upload = await getStorageProvider().createUploadIntent({ key: resumeKey, contentType: input.resume.mimeType, contentLength: input.resume.sizeBytes, expiresInSeconds: storageTtlSeconds() });
  return { application: withoutResumeStorageKey(application as unknown as ApplicationWithResumeKey), resumeUpload: { uploadUrl: upload.uploadUrl, uploadExpiresAt: upload.expiresAt } };
}

export async function listMyApplications(userId: string) {
  const profile = await getStudentProfile(userId);
  const applications = await prisma.application.findMany({ where: { studentId: profile.id }, orderBy: { createdAt: 'desc' }, include: { internship: { include: { domain: true } }, attempts: { select: { id: true, status: true, percentage: true, passed: true, submittedAt: true }, orderBy: { startedAt: 'desc' }, take: 1 } } });
  return applications.map(application => withoutResumeStorageKey(application as unknown as ApplicationWithResumeKey));
}

export async function getMyApplication(userId: string, publicId: string) {
  const profile = await getStudentProfile(userId);
  const application = await prisma.application.findFirst({ where: { publicId, studentId: profile.id }, include: { internship: { include: { domain: true } }, attempts: { select: { id: true, status: true, percentage: true, passed: true, submittedAt: true } } } });
  return application ? withoutResumeStorageKey(application as unknown as ApplicationWithResumeKey) : null;
}

export async function submitMyApplication(userId: string, publicId: string) {
  const profile = await getStudentProfile(userId);
  const application = await prisma.application.findFirst({ where: { publicId, studentId: profile.id }, include: { internship: { include: { assessments: { where: { active: true }, select: { id: true } } } } } });
  if (!application) throw new Error('APPLICATION_NOT_FOUND');
  if (application.status !== ApplicationStatus.DRAFT) throw new Error('INVALID_APPLICATION_STATE');
  const nextStatus = application.internship.assessments.length > 0 ? ApplicationStatus.ASSESSMENT_PENDING : ApplicationStatus.SUBMITTED;
  const updated = await prisma.application.update({ where: { id: application.id }, data: { status: nextStatus, submittedAt: new Date() }, include: { internship: { include: { domain: true } } } });
  return withoutResumeStorageKey(updated as unknown as ApplicationWithResumeKey);
}

export async function authorizeResumeDownload(adminId: string, applicationId: string) {
  if (!isStorageConfigured()) throw new Error('RESUME_STORAGE_NOT_CONFIGURED');
  const application = await prisma.application.findUnique({ where: { id: applicationId }, select: { id: true, resumeStorageKey: true } });
  if (!application?.resumeStorageKey) throw new Error('RESUME_NOT_FOUND');
  validateStorageKey(application.resumeStorageKey);
  const download = await getStorageProvider().createDownloadIntent({ key: application.resumeStorageKey, expiresInSeconds: storageTtlSeconds() });
  await prisma.auditEvent.create({ data: { actorId: adminId, action: 'RESUME_DOWNLOAD_INTENT_ISSUED', entity: 'Application', entityId: applicationId, metadata: {} } });
  return { applicationId: application.id, downloadUrl: download.downloadUrl, expiresAt: download.expiresAt };
}
