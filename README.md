# Internship Portal

A premium, company-owned internship programme platform for structured applications, domain assessments, mentorship, project assignments, evaluations, and student growth. This repository currently contains the responsive public website and a role-based workspace prototype designed around the product specification.

> This is not an internship marketplace. Students apply directly to internships offered by the company.

## Product surface

The experience is organized around one student journey: **Explore → Role Details → Apply → Domain Assessment → Review → Submit → Selection → Onboarding → Project → Mentorship → Tasks → Submission → Evaluation → Completion**. The public site introduces the programme, communicates the eight internship domains, explains the journey, and provides role exploration. The workspace prototype demonstrates the intended student, mentor, and admin information architecture without fabricating live programme statistics, testimonials, partnerships, placement rates, or credentials.

| Area | Included in this implementation |
| --- | --- |
| Public website | Landing page, programme narrative, domain cards, journey map, open-role exploration, responsive navigation |
| Internship domains | Software Development, AI / ML, Data, Cybersecurity, Cloud & DevOps, Design, Marketing, Business Development |
| Role exploration | Search, domain detail view, role cards, project-based role copy, application confirmation state |
| Workspaces | Student, Mentor, and Admin demo views with role-specific navigation and operational cards |
| Design system | Natural ivory, charcoal, muted gold, editorial serif accents, mono metadata, responsive layout |
| Quality | TypeScript strict mode, Vitest smoke tests, build verification, mobile breakpoints, focusable controls |

## Technology

The current frontend is a lightweight **React 19 + TypeScript + Vite** application. Lucide icons provide interface iconography, while CSS custom properties provide the visual tokens. The current data is intentionally local and deterministic so that the public experience can be reviewed without external credentials.

The production architecture should extend this frontend with a server-backed API and database. Recommended domains include users and roles, internships, applications, assessments and question banks, project templates, assignments, milestones, tasks, submissions, mentor feedback, evaluations, documents, notifications, and audit events. Authorization must be enforced on the server for every protected operation; hiding a client route is not a security boundary.

## Local setup

```bash
pnpm install
pnpm dev
```

The development server runs on the Vite default port. The application can be built and previewed with:

```bash
pnpm run build
pnpm run preview
```

## Verification

```bash
pnpm test       # Vitest smoke tests
pnpm run lint   # TypeScript no-emit check
pnpm run build  # TypeScript project build plus Vite production bundle
```

## Environment variables

No external credentials are required for the current public prototype. When production integrations are added, secrets must be provided through deployment configuration and never committed to the repository. Expected future variables include the database connection string, session/JWT secret, OAuth application credentials, object storage credentials, transactional email provider credentials, and an application base URL. Each integration should be added with a documented `.env.example` entry, server-side validation, least-privilege access, and a safe failure mode.

## Security and privacy

Uploaded resumes, identity documents, and generated files must remain outside Git and should be stored in private object storage with signed, time-limited access URLs. File uploads require MIME and size validation, malware scanning, authorization checks, and audit logging. Production APIs should apply schema validation, rate limiting, CSRF protection where applicable, secure cookies, role-based authorization, and redaction of sensitive data from logs. The `.gitignore` excludes environment files, build output, logs, coverage, and common generated directories.

## Git workflow

Normal work should happen on feature branches rather than directly on `main`. Suggested branch names are `feature/public-website`, `feature/internship-system`, `feature/student-application`, `feature/domain-assessment`, `feature/authentication`, `feature/student-dashboard`, `feature/admin-dashboard`, `feature/mentor-dashboard`, and `feature/project-management`. Use focused commits such as `feat: add internship listing`, `feat: add student application flow`, `test: add application flow tests`, `fix: protect admin routes`, and `docs: update project documentation`. Open a pull request for review before merging into `main`.

## Current scope and roadmap

The current commit prioritizes a polished public website and a demonstrable operational information architecture. The next production increments are the persistent database schema and API, real OAuth/session handling, server-enforced roles, document storage, assessment authoring and grading, application review workflows, notifications, email delivery, audit events, and end-to-end browser tests. These integrations should be configured with real credentials only when the company provides them.

## Repository status

The repository began as a minimal README-only project. The implementation in this branch adds the Vite application, the public experience, role workspaces, configuration smoke tests, production build configuration, and this documentation. No company claims or unsupported performance statistics are included.

## Phase 1 database architecture

The `feature/database-prisma` branch adds the first persistence layer for the full-stack roadmap. It uses **PostgreSQL + Prisma 7** as a modular-monolith foundation. The schema is intentionally normalized around the internship lifecycle rather than storing workflow state in frontend-only objects.

The schema includes users and role profiles, domains, skills, internships, applications, assessments, questions, attempts and answers, project templates, project assignments, milestones, tasks, submissions, mentor feedback, evaluations, secure document references, notifications, mentorship sessions, and audit events. Foreign keys, unique constraints, status enums, timestamps, cascade behavior, and workflow-oriented indexes are included.

| Database artifact | Location or command |
| --- | --- |
| Prisma schema | `prisma/schema.prisma` |
| Prisma CLI configuration | `prisma.config.ts` |
| Initial migration baseline | `prisma/migrations/0001_init/migration.sql` |
| Database singleton | `src/server/db.ts` |
| Development seed | `prisma/seed.ts` |
| Environment template | `.env.example` |
| Client generation | `pnpm run db:generate` |
| Schema validation | `pnpm run db:validate` |
| Local migration | `pnpm run db:migrate` |
| Deployment migration | `pnpm run db:deploy` |
| Development seed | `pnpm run db:seed` |

### Database setup

Copy `.env.example` to `.env`, provide a PostgreSQL `DATABASE_URL`, and then run the following commands:

```bash
cp .env.example .env
pnpm install
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
```

The seed is development-only and creates eight domains, representative **unpublished** internships, and three clearly marked demo users. It does not create passwords, publish roles, or represent real students, mentors, application outcomes, company statistics, or credentials. Authentication and password handling are deliberately deferred to Phase 2.

### Phase 1 security boundary

This phase creates persistence architecture only. It does **not** claim to implement authentication, session handling, server-side RBAC, API endpoints, file storage, assessment scoring, document authorization, or live frontend-to-database data access. Those are separate phases. Resume, document, and submission fields store private storage references rather than public URLs; serving those objects must go through an authorized service in a later phase.

The migration was generated from the validated schema without requiring a live database in the sandbox. Applying it requires a reachable PostgreSQL instance and a correctly configured `DATABASE_URL`.

## Current implementation status

| Phase | Status |
| --- | --- |
| Phase 1 — Database + Prisma | Complete |
| Phase 2 — Authentication + RBAC | Complete on `feature/auth-rbac` |
| Phase 3 — Internship/domain backend | Next |
| Phases 4–14 | Planned and not yet complete |

## Phase 2 authentication and RBAC

Phase 2 adds a modular Express API layer with real password hashing, opaque database-backed sessions, HTTP-only cookies, logout and logout-all behavior, forgot-password token storage, password reset, current-user lookup, account-status checks, and role middleware for `STUDENT`, `MENTOR`, and `ADMIN`.

Authentication logic is separated from HTTP routing. The main pieces are `src/server/auth.ts`, `src/server/middleware.ts`, `src/server/auth-routes.ts`, `src/server/app.ts`, and `server/index.ts`. The API can be run locally with:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/internship_portal?schema=public" pnpm run api:dev
```

The protected role checks are enforced at the server boundary. A frontend route or hidden navigation item is not treated as authorization. The API returns consistent `401` authentication errors and `403` permission errors, while validation errors are returned without stack traces or internal details.

Phase 2 adds the `Session` and `PasswordResetToken` tables in `prisma/migrations/0002_auth_sessions/migration.sql`. Password reset email delivery is intentionally disabled unless `EMAIL_PROVIDER_API_KEY` is configured; the system does not pretend to send email. Development-only reset tokens are logged only outside production to make local testing possible.

## Phase 3 internship and domain backend

Phase 3 adds `src/server/internship-service.ts` and `src/server/internship-routes.ts`. Public endpoints now read active domains and published, non-archived internships from Prisma. Search and domain filtering are supported, and public detail responses include only active assessments and no draft records.

Admin-only endpoints support domain creation and updates, internship creation and updates, publish/unpublish operations, and archive behavior. These operations are protected by the server-side `ADMIN` role middleware. The public UI requests `/api/domains` on load and uses the existing local configuration only as a bounded preview fallback when the API is not running; the visual system and layout remain unchanged.

The current implementation status is now: Phase 1 complete, Phase 2 complete, Phase 3 complete on `feature/internship-backend`, and Phase 4 student applications next. Persistent application creation, resume validation, and the multi-step Apply flow are not yet complete.

## Phase 4 student application workflow

Phase 4 adds `src/server/application-service.ts` and `src/server/application-routes.ts`. Authenticated students can create an application for a published internship, persist profile fields and skills, retrieve only their own applications, view an ownership-scoped application detail, and submit a draft application. Duplicate applications are blocked by the existing compound database constraint. Submitted applications move to `ASSESSMENT_PENDING` when an active assessment exists, otherwise to `SUBMITTED`.

Application identifiers use a non-sequential `APP-YYYY-XXXXXXXX` format. Resume handling validates MIME type, size, and a private storage key reference; actual object-storage upload and signed download delivery remain part of the document/storage phase. Required profile fields, URLs, skills, graduation year, and application payload shape are validated with Zod. Students cannot select an internship that is unpublished or archived, and route-level ownership is enforced through the authenticated student profile.

The current implementation status is now: Phase 1 complete, Phase 2 complete, Phase 3 complete, and Phase 4 complete on `feature/student-application`. The next phase is the database-backed assessment engine and admin question bank.

## Phase 5 assessment engine

Phase 5 adds `src/server/assessment-service.ts` and `src/server/assessment-routes.ts`. Students can retrieve assessment metadata and sanitized active questions, start an attempt tied to their own application, save answers only while the attempt is in progress, and submit once. The service calculates marks, percentage, pass/fail, and application assessment status on the server. Correct answers are never included in the student question response.

Admin-only assessment routes support creating and updating assessments, creating and editing questions, archiving questions, setting difficulty and marks, and configuring passing scores, duration, and attempt limits. Invalid attempts, exhausted attempts, submitted-attempt edits, unrelated applications, and unrelated questions are rejected by server-side ownership and state checks.

The current implementation status is now: Phases 1–5 complete on their respective feature branches. Phase 6, admin application review and audited state transitions, is next. A live PostgreSQL database is still required to exercise persistence end-to-end; unit and build checks run without one.

## Phase 6 admin application review

Phase 6 adds `src/server/admin-review-service.ts` and `src/server/admin-review-routes.ts`. Admins can search, filter, paginate, and inspect application records with student profile, internship/domain, resume reference, assessment result, and reviewer context. Sensitive actions are server-side ADMIN-only.

Application status changes are governed by an explicit transition map rather than unrestricted writes. Each transition records an `AuditEvent` with actor, entity, entity ID, source state, destination state, and relevant metadata. Admin notes are also audited. Mentor assignment and project assignment are intentionally deferred to the subsequent mentor and project phases.

The current implementation status is now: Phases 1–6 complete on their focused branches. The next phase connects the student dashboard to real applications and programme data.

## Phase 7 student dashboard

Phase 7 adds `src/server/student-dashboard-service.ts` and `src/server/student-dashboard-routes.ts`. The authenticated student dashboard now has a real database query boundary for the current application, application history, assessment summaries, assigned projects, milestones, tasks, mentor context, unread and recent notifications, and published documents. All records are scoped through the authenticated student profile and user ID.

The current frontend workspace remains visually preserved while the API surface is prepared for the next UI wiring increment. Empty states are represented by `null` or empty arrays from the service rather than fabricated statistics. The current implementation status is now: Phases 1–7 complete on focused branches. The next phase implements mentor assignments, scoped mentor access, reviews, and mentorship sessions.
