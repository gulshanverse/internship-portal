import { describe, expect, it } from 'vitest';
import {
  ApplicationStatus,
  AssessmentQuestionType,
  AttemptStatus,
  Difficulty,
  DocumentStatus,
  DocumentType,
  EvaluationResult,
  NotificationType,
  PrismaClient,
  ProjectStatus,
  SubmissionStatus,
  TaskStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import type { ApplicationStatus as ApplicationStatusType, AssessmentQuestionType as AssessmentQuestionTypeType, AttemptStatus as AttemptStatusType, Difficulty as DifficultyType, DocumentStatus as DocumentStatusType, DocumentType as DocumentTypeType, EvaluationResult as EvaluationResultType, NotificationType as NotificationTypeType, Prisma, ProjectStatus as ProjectStatusType, SubmissionStatus as SubmissionStatusType, TaskStatus as TaskStatusType, User, UserRole as UserRoleType, UserStatus as UserStatusType } from '@prisma/client';

type RequiredTypeExports = [
  ApplicationStatusType,
  AssessmentQuestionTypeType,
  AttemptStatusType,
  DifficultyType,
  DocumentStatusType,
  DocumentTypeType,
  EvaluationResultType,
  NotificationTypeType,
  Prisma,
  ProjectStatusType,
  SubmissionStatusType,
  TaskStatusType,
  User,
  UserRoleType,
  UserStatusType,
];

const typeExportCheck: RequiredTypeExports | undefined = undefined;

void typeExportCheck;

describe('generated Prisma Client exports', () => {
  it('exposes the Prisma client and required runtime enums after generation', () => {
    expect(PrismaClient).toBeDefined();
    expect(ApplicationStatus.DRAFT).toBe('DRAFT');
    expect(AssessmentQuestionType.SINGLE_CHOICE).toBe('SINGLE_CHOICE');
    expect(AttemptStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    expect(Difficulty.BEGINNER).toBe('BEGINNER');
    expect(DocumentType.CERTIFICATE).toBeDefined();
    expect(DocumentStatus.PUBLISHED).toBe('PUBLISHED');
    expect(EvaluationResult.COMPLETED).toBe('COMPLETED');
    expect(ProjectStatus.ASSIGNED).toBe('ASSIGNED');
    expect(SubmissionStatus.SUBMITTED).toBe('SUBMITTED');
    expect(TaskStatus.TODO).toBe('TODO');
    expect(NotificationType.APPLICATION_SUBMITTED).toBe('APPLICATION_SUBMITTED');
    expect(UserRole.STUDENT).toBe('STUDENT');
    expect(UserStatus.ACTIVE).toBe('ACTIVE');
  });
});
