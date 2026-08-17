# Internship Portal Staging Validation Matrix

This matrix is the release-candidate checklist for a controlled staging environment. A row is complete only when the named evidence is recorded against the configured staging deployment. Local checks listed below have been executed in the repository; live checks remain environment-dependent.

| Area | Validation | Expected result | Evidence to record | Current status |
|---|---|---|---|---|
| Database | Prisma schema validation and client generation | Schema is valid and client generation succeeds | CI log and commit SHA | **Passed locally** |
| Local integration | Disposable container runtime | PostgreSQL and Mailpit start only with fake local values; no production connectivity | Compose logs and health output | **Blocked: Docker/Podman unavailable in audit sandbox** |
| Database | Apply committed migrations to an empty or backed-up staging database | Migration completes without reset or destructive operation | Migration log and backup identifier | **Pending live staging** |
| Database | Query latency and query-plan review | No unacceptable latency or N+1 behavior at staging cardinality | Timings and query plans | **Pending live staging** |
| Authentication | Password hashing and verification | Plaintext is never retained; valid and invalid password checks behave correctly | Test output | **Passed locally** |
| Authentication | Session expiry, revocation, and inactive-user rejection | Expired, revoked, and inactive sessions are rejected | API test evidence | **Pending live staging** |
| Authentication | Maintenance cleanup | Only expired/revoked sessions and expired/used reset tokens are removed | Scheduler log and row counts | **Code/tested; scheduler pending** |
| Authorization | Student, mentor, and admin RBAC | Allowed roles succeed; disallowed roles receive generic 401/403 responses | API matrix | **Passed by unit coverage; live matrix pending** |
| Authorization | Cross-user IDOR checks | Student A cannot read Student B applications, assessments, projects, evaluations, notifications, or documents | Test IDs and response codes | **Document boundary tested; full live matrix pending** |
| Documents | Private bucket and provider gateway | Bucket is non-public and signed intents expire | Provider policy and signed URL samples | **Infrastructure pending** |
| Documents | Upload intent | Server generates randomized key; client supplies metadata only; MIME and 10 MiB limit enforced | Request/response capture | **Passed locally** |
| Documents | Resume upload intent | Server generates randomized resume key; arbitrary client storage keys are ignored; MIME and 5 MiB limit enforced | Resume request/response capture | **Passed locally** |
| Documents | Admin resume access | Raw resume keys are omitted from admin list/detail responses; admin receives only a short-lived download intent | Admin API capture and audit event | **Passed locally by code/tests; live staging pending** |
| Documents | Task submission files | Client-controlled `fileStorageKey` is rejected; no authoritative submission file path is persisted without a secure intent flow | Route schema and service regression test | **Passed locally; attachment intent flow pending if required** |
| Documents | Download intent | Only the owning student can obtain an intent for a published document | Regression test and live response | **Passed locally; live staging pending** |
| Documents | Revocation | Revoked documents cannot be downloaded through the application | API response evidence | **Pending live staging** |
| Email | Provider configuration | Provider is explicitly configured before delivery is claimed | Provider health check and delivery event | **Pending; disabled by default** |
| CI/CD | Pull-request checks | Install, typecheck, lint, tests, Prisma checks, and build pass | GitHub Actions run URL | **Pending current PR run** |
| HTTP security | Headers, body limits, cookies, and TLS | Security headers are present; cookies are secure/HttpOnly; TLS is enforced | Header capture and deployment config | **Partially local; live pending** |
| Rate limiting | Login/API abuse controls | Limits hold across the deployed topology | Load test and store configuration | **Single-process local; shared store required for multi-instance** |
| E2E | Student lifecycle | Register/login, browse, apply, assess, view status, and receive documents | Browser recording or test report | **Pending live staging** |
| E2E | Mentor/admin lifecycle | Assignment, review, project/task, evaluation, and notification flows work | Browser recording or test report | **Pending live staging** |
| Accessibility | Keyboard, focus, labels, contrast, announcements | No release-blocking accessibility defects | Automated and manual report | **Pending live staging** |
| SEO | Public metadata and generated assets | Canonical/site URL is environment-driven; only public root is in sitemap; private routes are disallowed | Build artifacts and HTTP response | **Passed locally with placeholder URL** |
| Observability | Logs, health, error reporting, and alerting | Health endpoint and actionable error telemetry are available | Health response and monitoring screenshots | **Pending live staging** |
| Recovery | Backup and restore drill | Backup can be restored and migration/application rollback path is documented | Restore log and incident record | **Pending live staging** |

## Release decision

The release candidate is **not production-ready solely from local verification**. It is suitable for manual staging review after the required database, private storage gateway, email, deployment, E2E, performance, accessibility, observability, and recovery evidence is collected. No production deployment or merge is implied by this matrix.
EOF
