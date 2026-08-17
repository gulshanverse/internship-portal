# Internship Portal Staging-Readiness Report

**Assessment date:** 18 August 2026
**Candidate branch:** `feature/resume-security`
**Candidate commit:** `f18da744ca8109182218ff047d6f82ef4969b8b7`
**Pull request:** [PR #25](https://github.com/gulshanverse/internship-portal/pull/25); PR #24 is already merged on GitHub.
**Merge/deployment status:** Candidate branch not merged or deployed.

## Overall readiness

The repository is **ready for manual review and controlled staging validation**, but it is not production-ready solely from local evidence. The high-severity document delivery blocker has been addressed in code with a provider-neutral private-storage boundary, server-generated randomized keys, short-lived upload/download intents, ownership checks, and regression tests. Live staging still must prove the configured storage gateway, database, email, deployment topology, browser lifecycle, performance, accessibility, observability, and recovery procedures.

## Changes made

The document service no longer accepts a client-supplied storage key. It validates MIME type and size, generates a randomized key below `private/documents/`, creates a private upload intent, and records an audit event. Student listing is filtered to published documents owned by the authenticated student. Download intent issuance requires both publication and ownership, and revoked or cross-student documents return the generic not-found path. The route surface uses metadata-only issuance and an authenticated download-intent endpoint; provider credentials are never returned.

A provider-neutral HMAC gateway contract was added. It requires a private endpoint or trusted storage gateway, bucket name, signing key, and bounded signed-URL TTL. The code intentionally does not pretend that S3, GCS, or Azure is configured; a concrete provider adapter and gateway deployment remain staging infrastructure work.

An idempotent `cleanupExpiredAuthArtifacts()` maintenance function was added. It removes only expired or revoked sessions and expired or consumed password-reset tokens in one transaction. It is not automatically scheduled by this change; the staging platform must invoke it through its approved scheduler.

A staging validation matrix, local integration package, and updated readiness guide were added. The documentation explicitly distinguishes locally verified controls from live staging evidence and records that process-local rate limiting is insufficient for multi-instance production deployment. The task-submission route no longer accepts a client-controlled file path; attachments require a future shared upload-intent flow rather than an unsafe fallback.

## Files changed

| File | Change |
|---|---|
| `src/server/storage.ts` | Provider-neutral private key generation, key validation, MIME policy, HMAC upload/download intents, bounded TTL, disabled-provider fallback |
| `src/server/document-service.ts` | Secure issuance, publication, revocation, ownership-filtered listing, signed download intents |
| `src/server/document-routes.ts` | Metadata-only admin issuance and authenticated student download-intent route |
| `src/server/storage.test.ts` | Key randomness, traversal rejection, MIME/size policy, configuration and TTL tests |
| `src/server/document-service.test.ts` | Cross-student denial and published-owner download authorization regression tests |
| `src/server/auth.ts` | Expired/revoked session and reset-token cleanup function |
| `src/server/auth.test.ts` | Cleanup transaction regression coverage plus existing auth/RBAC tests |
| `docs/STAGING_READINESS.md` | Storage, session cleanup, rate-limit, and query-scaling requirements |
| `docs/STAGING_VALIDATION_MATRIX.md` | Release-candidate staging evidence matrix |
| `docker-compose.local-staging.yml` | Disposable PostgreSQL/Mailpit services with fake local-only values |
| `docs/LOCAL_INTEGRATION.md` | Safe local integration start/stop and evidence boundary |
| `src/server/project-service.test.ts` | Task ownership and client file-path regression tests |
| `src/server/middleware.test.ts` | RBAC and same-user authorization regression tests |

Generated host-specific SEO files under `public/` were intentionally not committed. The production build generates them from `PUBLIC_SITE_URL`. Docker/Podman was unavailable in the audit sandbox, so the disposable PostgreSQL/Mailpit package was documented but not started; no local integration result is claimed.

## Validation actually executed

| Check | Result |
|---|---|
| `pnpm prisma validate` | Passed; schema valid |
| `pnpm exec prisma generate` | Passed; Prisma Client generated |
| Vitest full suite | Passed: 9 files, 26 tests |
| TypeScript check | Passed: `tsc --noEmit` and build typecheck |
| Lint | Passed |
| Production build | Passed with placeholder `PUBLIC_SITE_URL=https://staging.your-domain.com/` |
| `git diff --check` | Passed |
| GitHub Actions push CI | Passed |
| GitHub Actions pull-request CI | Passed |

No real database URL, storage credential, email credential, production URL, or production infrastructure was accessed or committed. No migration was applied, reset, or modified.

## Security findings and status

The document delivery blocker is resolved at the application boundary, subject to live provider verification. The test suite proves that a document not returned by the ownership-and-publication query cannot result in a signed download intent. Signed URL TTL is bounded to 60–900 seconds, defaulting to 300 seconds. Storage keys reject traversal, absolute paths, backslashes, malformed characters, and insufficient length.

The application resume path has now been migrated to the same server-generated private-storage intent boundary. Resume requests accept filename, MIME type, and size metadata only; arbitrary client storage keys are ignored by the service and are no longer part of the route schema. The server generates the private key, returns only a short-lived upload intent, and exposes an admin-only signed download-intent route. Raw resume storage keys are removed from admin application list/detail responses. Task submissions previously accepted a client-controlled `fileStorageKey`; that field is now rejected by the route contract and no authoritative submission file path is persisted until a dedicated shared upload-intent flow is implemented.

The current rate limiter is process-local memory. It is acceptable only for a single-instance controlled staging test. A shared store is required for a multi-instance deployment. The security headers and request body limit are implemented locally, but TLS, secure-cookie behavior behind the actual proxy, and deployment trust-proxy configuration require live verification.

## Database and migration status

The Prisma schema validated successfully and the client generated successfully. No migration files were changed and no database connection or mutation was performed during this work. Existing migrations remain the deployment source of truth. Staging deployment must apply them only after a verified backup and target review; reset commands are prohibited.

Static query review found bounded pagination for admin application review and notification lists. Project, mentor, evaluation, application-history, and student-document list queries still require live cardinality measurements and query-plan review. No production performance claim is made for those paths.

## Authentication and RBAC status

Password hashing, password verification, unauthenticated role denial, and wrong-role denial passed automated tests. Session resolution rejects missing, revoked, expired, and inactive-user sessions. The new cleanup function is covered by tests but requires a scheduler invocation in staging. Live tests are still required for cookie attributes, session expiry/revocation across requests, password-reset lifecycle, and the full cross-role matrix.

## Storage and document status

The code path is suitable for a controlled staging review once a private object-storage gateway is configured. Required live evidence includes private bucket policy, upload completion, content-type/size enforcement, signed URL expiry, revoked-document denial, cross-student denial, and provider audit logs. No permanent public storage URL is emitted by the refactored document service.

## Email, CI/CD, E2E, performance, accessibility, and SEO

Email remains intentionally disabled unless a real provider adapter and credentials are configured. Delivery must not be claimed while disabled. PR #24 has both push and pull-request CI checks passing. Browser E2E, mobile behavior, accessibility review, live performance/query plans, error monitoring, backup restore, and incident response evidence remain pending live staging.

SEO generation passed with the placeholder site URL. `PUBLIC_SITE_URL` is environment-driven; the generated sitemap contains only the public root, and `robots.txt` excludes `/api/` and `/workspace`. No real staging or production domain is claimed.

## Required infrastructure and environment variables

Staging requires PostgreSQL, an application runtime, TLS termination, a configured public site URL, a private object-storage bucket or trusted signing gateway, monitoring/error reporting, and an email provider if email is enabled. The runtime configuration must supply `DATABASE_URL`, `NODE_ENV`, `APP_URL`, `PUBLIC_SITE_URL`, `AUTH_SECRET`, session settings, `STORAGE_ENDPOINT` or `STORAGE_SIGNED_URL_BASE`, `STORAGE_BUCKET`, `OBJECT_STORAGE_SIGNING_KEY`, `SIGNED_URL_TTL_SECONDS`, email settings, rate-limit settings, and monitoring settings. Secret values belong only in the deployment secret manager.

## Production blockers

The remaining blockers are live infrastructure and evidence rather than unverified claims in the local code gate: concrete private-storage provider integration and authorization testing; a dedicated task-submission attachment intent flow if file attachments are required; real staging PostgreSQL migration and query-plan measurements; scheduled auth cleanup; shared rate-limit storage for multi-instance operation; email provider configuration; live browser E2E and IDOR matrix; accessibility, mobile, performance, observability, backup/restore, and rollback drills.

## Exact next steps

1. Review the new `feature/resume-security` candidate after its pull request is created; PR #24 is already merged and must not be treated as the current unmerged candidate.
2. Provision a non-public staging object-storage bucket and a trusted gateway or concrete provider adapter, then populate only the required runtime secret-manager values.
3. Apply existing migrations to a backed-up staging database using the deployment platform's non-reset migration command.
4. Schedule `cleanupExpiredAuthArtifacts()` and record its counts.
5. Run the staging validation matrix, including cross-student IDOR, signed URL expiry, revocation, E2E lifecycle, accessibility, performance/query-plan, email, monitoring, and restore evidence.
6. Keep the new resume-security pull request unmerged until the manual review and staging evidence are complete.

## Final decision

**READY FOR MANUAL REVIEW:** Yes; PR #25 is open and both push and pull-request CI checks passed.
**READY TO MERGE WITHOUT STAGING EVIDENCE:** No.
**MERGED:** PR #24 is merged; PR #25 is open with no merge commit.
**DEPLOYED:** No.
