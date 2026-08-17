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
