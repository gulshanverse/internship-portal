import { ApplicationStatus, AssessmentQuestionType, AttemptStatus, Difficulty, Prisma } from '@prisma/client';
import { prisma } from './db';

export async function getAssessmentForStudent(userId: string, assessmentId: string, applicationPublicId: string) {
  const application = await prisma.application.findFirst({ where: { publicId: applicationPublicId, student: { userId }, internship: { assessments: { some: { id: assessmentId, active: true } } } }, include: { internship: { include: { assessments: { where: { id: assessmentId }, include: { questions: { where: { active: true }, select: { id: true, question: true, type: true, options: true, difficulty: true, marks: true, timeLimitSeconds: true } } } } } } } });
  if (!application) throw new Error('ASSESSMENT_NOT_AVAILABLE');
  const assessment = application.internship.assessments[0];
  const attempts = await prisma.assessmentAttempt.count({ where: { assessmentId, applicationId: application.id } });
  if (attempts >= assessment.attemptsAllowed) throw new Error('ATTEMPTS_EXHAUSTED');
  return { id: assessment.id, title: assessment.title, description: assessment.description, durationMinutes: assessment.durationMinutes, passingScore: assessment.passingScore, attemptsAllowed: assessment.attemptsAllowed, attemptsUsed: attempts, questionCount: assessment.questions.length, questions: assessment.questions };
}

export async function startAttempt(userId: string, assessmentId: string, applicationPublicId: string) {
  const application = await prisma.application.findFirst({ where: { publicId: applicationPublicId, student: { userId }, internship: { assessments: { some: { id: assessmentId, active: true } } } } });
  if (!application) throw new Error('ASSESSMENT_NOT_AVAILABLE');
  const existing = await prisma.assessmentAttempt.findFirst({ where: { applicationId: application.id, assessmentId, status: AttemptStatus.IN_PROGRESS } });
  if (existing) return existing;
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { attemptsAllowed: true } });
  const attempts = await prisma.assessmentAttempt.count({ where: { applicationId: application.id, assessmentId } });
  if (!assessment || attempts >= assessment.attemptsAllowed) throw new Error('ATTEMPTS_EXHAUSTED');
  return prisma.assessmentAttempt.create({ data: { assessmentId, applicationId: application.id, studentId: application.studentId } });
}

function jsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function saveAnswer(userId: string, attemptId: string, questionId: string, answer: unknown) {
  const attempt = await prisma.assessmentAttempt.findFirst({ where: { id: attemptId, student: { userId }, status: AttemptStatus.IN_PROGRESS }, include: { assessment: { select: { id: true } } } });
  if (!attempt) throw new Error('ATTEMPT_NOT_EDITABLE');
  const question = await prisma.question.findFirst({ where: { id: questionId, assessmentId: attempt.assessmentId, active: true }, select: { id: true } });
  if (!question) throw new Error('QUESTION_NOT_FOUND');
  return prisma.assessmentAnswer.upsert({ where: { attemptId_questionId: { attemptId, questionId } }, update: { answer: jsonValue(answer) }, create: { attemptId, questionId, answer: jsonValue(answer) } });
}

export async function submitAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findFirst({ where: { id: attemptId, student: { userId }, status: AttemptStatus.IN_PROGRESS }, include: { assessment: { include: { questions: { where: { active: true }, select: { id: true, correctAnswer: true, marks: true } } } }, answers: true, application: true } });
  if (!attempt) throw new Error('ATTEMPT_NOT_EDITABLE');
  let score = 0; const total = attempt.assessment.questions.reduce((sum, q) => sum + q.marks, 0);
  const answerByQuestion = new Map(attempt.answers.map(answer => [answer.questionId, answer.answer]));
  const updates = attempt.assessment.questions.map(question => {
    const submitted = answerByQuestion.get(question.id);
    const isCorrect = JSON.stringify(submitted) === JSON.stringify(question.correctAnswer);
    const marks = isCorrect ? question.marks : 0;
    score += marks;
    return prisma.assessmentAnswer.upsert({ where: { attemptId_questionId: { attemptId, questionId: question.id } }, update: { marks, isCorrect, answer: jsonValue(submitted) }, create: { attemptId, questionId: question.id, answer: jsonValue(submitted), marks, isCorrect } });
  });
  const percentage = total === 0 ? 0 : Number(((score / total) * 100).toFixed(2));
  const passed = percentage >= attempt.assessment.passingScore;
  const result = await prisma.$transaction([
    ...updates,
    prisma.assessmentAttempt.update({ where: { id: attemptId }, data: { submittedAt: new Date(), status: AttemptStatus.SUBMITTED, score, percentage, passed } }),
    prisma.application.update({ where: { id: attempt.applicationId }, data: { status: ApplicationStatus.ASSESSMENT_COMPLETED } }),
  ]);
  return { attemptId, score, total, percentage, passed, status: AttemptStatus.SUBMITTED, resultCount: result.length };
}

export async function createQuestion(input: { assessmentId: string; domainId?: string; question: string; type: AssessmentQuestionType; options?: unknown; correctAnswer?: unknown; explanation?: string; difficulty?: Difficulty; marks?: number; timeLimitSeconds?: number }) {
  const { options, correctAnswer, ...rest } = input;
  return prisma.question.create({ data: { ...rest, options: options === undefined ? undefined : jsonValue(options), correctAnswer: correctAnswer === undefined ? undefined : jsonValue(correctAnswer) } });
}

export async function updateQuestion(id: string, input: Record<string, unknown>) {
  const { options, correctAnswer, ...rest } = input;
  return prisma.question.update({ where: { id }, data: { ...rest, options: options === undefined ? undefined : jsonValue(options), correctAnswer: correctAnswer === undefined ? undefined : jsonValue(correctAnswer) } as Parameters<typeof prisma.question.update>[0]['data'] });
}

export async function archiveQuestion(id: string) {
  return prisma.question.update({ where: { id }, data: { active: false } });
}

export async function createAssessment(input: { internshipId: string; title: string; description: string; durationMinutes?: number; passingScore: number; attemptsAllowed?: number }) {
  return prisma.assessment.create({ data: input });
}

export async function updateAssessment(id: string, input: Partial<Parameters<typeof prisma.assessment.update>[0]['data']>) {
  return prisma.assessment.update({ where: { id }, data: input });
}
