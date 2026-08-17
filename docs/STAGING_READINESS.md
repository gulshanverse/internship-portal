# Staging Readiness Guide

## Readiness position

The repository is **staging-ready for a controlled validation environment**, not production-deployed. The local verification gate passes schema validation, Prisma client generation, TypeScript, unit/security tests, production build, and whitespace checks. A live staging environment is still required to validate PostgreSQL connectivity, private object storage, transactional email, browser E2E, mobile behavior, accessibility, and runtime observability.

## Infrastructure requirements

Staging requires a managed PostgreSQL instance, a private object-storage bucket, an application runtime capable of running the API and serving the Vite build, TLS termination, a configured staging domain such as `staging.your-domain.com`, and a monitoring/error-reporting destination. The storage bucket must deny public access and use application-mediated authorization or short-lived signed URLs.

## Environment configuration

Copy `.env.example` into the staging secret manager or runtime environment. Required categories are database, application, authentication, private storage, email, security/rate limiting, and monitoring. Real credentials must be injected by the deployment platform and must never be committed.

## Database procedure

Use `pnpm run db:validate` and `pnpm run db:generate` during build verification. Apply committed migrations to staging with `pnpm run db:deploy` only after taking a backup and confirming the target `DATABASE_URL`. Never use reset commands against staging or production. The seed script is development-only and must not run against production data.

## Private storage procedure

Configure a private bucket and least-privilege access key. Validate MIME type, extension, size, randomized storage keys, ownership, and authorization before accepting files. The application must never return a permanent public storage URL. Configure `OBJECT_STORAGE_SIGNING_KEY` and `SIGNED_URL_TTL_SECONDS` only in the runtime secret manager; verify expiry and unauthorized-access responses in staging.

## Email procedure

The provider is intentionally disabled unless a real provider adapter and credentials are configured. Configure `EMAIL_PROVIDER`, `EMAIL_PROVIDER_API_KEY`, and `EMAIL_FROM` in staging, then verify application confirmation, status, assessment, mentor/project assignment, feedback, evaluation, document, deadline, and completion templates. Do not report delivery when the provider is disabled.

## Authentication and security checklist

Verify TLS, secure and HttpOnly cookies, SameSite behavior, session expiry and revocation, password reset expiry, login failure behavior, role authorization, request body limits, rate limiting, defensive headers, generic error responses, audit events, and student/mentor ownership isolation. Test Student-to-Admin, Student-to-Mentor, cross-student, cross-mentor, unrelated project, assessment, application, and document access attempts.

## Browser, mobile, accessibility, and performance validation

Against a provisioned staging URL, execute the student, mentor, and admin lifecycle in a real browser. Test narrow mobile viewports for overflow and touch targets. Run keyboard-only navigation, focus visibility, form labels, error announcements, contrast, and screen-reader checks. Measure public page load, internship listing/search, dashboard query latency, admin pagination, and bundle size. Investigate N+1 queries before production use.

## SEO validation

Confirm title, description, canonical URL, Open Graph metadata, robots policy, sitemap availability, and clean public internship URLs. Private API, workspace, and document routes must not be indexed. Set `PUBLIC_SITE_URL` in the build environment for the target deployment. The build runs `scripts/generate-seo-assets.mjs`, validates the absolute HTTP/HTTPS URL, and generates `robots.txt` and `sitemap.xml` with only the configured public root. Do not commit generated host-specific SEO assets or invent a production domain.

## Rollback and backup

Before migration deployment, create a tested database backup and record the migration identifier. Roll back application code through the platform’s previous immutable release. Database rollback must use a forward corrective migration or a verified restore procedure; do not reset migration history.

## Release gate

A staging release is ready for production review only after the live database migration, private storage authorization, email provider behavior, browser E2E lifecycle, unauthorized-access tests, mobile/accessibility/SEO checks, performance review, logs, health checks, backup restore drill, and incident contact path have all been recorded as passing in the staging environment.
