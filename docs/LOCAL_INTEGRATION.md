# Disposable Local Integration Environment

This package is for **local development and ephemeral validation only**. It must never be pointed at production or at a real staging database. The compose file uses fake development-only credentials and exposes PostgreSQL on `localhost:55432` and Mailpit SMTP/UI on `localhost:51025`/`localhost:58025`.

## Runtime status

The sandbox used for this audit does not have Docker, Docker Compose, or Podman installed. Therefore the services in `docker-compose.local-staging.yml` were **not started**, and no database migration, seed, email delivery, or application-startup result is claimed from this package.

## Start and stop

On a development machine with Docker Compose available, start the disposable services with:

```bash
docker compose -f docker-compose.local-staging.yml up -d
```

Check service health with:

```bash
docker compose -f docker-compose.local-staging.yml ps
docker compose -f docker-compose.local-staging.yml logs --tail=100 postgres mailpit
```

Stop the services without deleting the local volume with:

```bash
docker compose -f docker-compose.local-staging.yml down
```

To destroy only this disposable environment and its local database volume, use the explicitly local command below. Never use an equivalent command against staging or production:

```bash
docker compose -f docker-compose.local-staging.yml down -v
```

## Local environment values

Use a separate untracked `.env.local` file with fake local values. The following values are examples only:

```dotenv
DATABASE_URL="postgresql://internship_local:local-only-password@127.0.0.1:55432/internship_portal_local?schema=public"
NODE_ENV="development"
APP_URL="http://127.0.0.1:5173"
PUBLIC_SITE_URL="http://127.0.0.1:5173"
AUTH_SECRET="local-only-not-for-staging-or-production"
STORAGE_ENDPOINT=""
STORAGE_BUCKET=""
OBJECT_STORAGE_SIGNING_KEY=""
SIGNED_URL_TTL_SECONDS="300"
EMAIL_PROVIDER="mailpit"
EMAIL_PROVIDER_API_KEY=""
EMAIL_FROM="Internship Portal <local@example.test>"
```

The current application storage boundary requires a trusted HMAC signing gateway or a concrete object-storage adapter. The compose package deliberately does not claim that PostgreSQL or Mailpit provides private object storage. Resume and issued-document upload/download integration therefore remains **blocked until a compatible local or staging storage gateway is supplied**.

## Safe database checks

After PostgreSQL is healthy and the local environment is loaded, use only the non-destructive commands below:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm run db:deploy
pnpm run db:seed
```

The seed is development-only. Do not use `prisma migrate reset` as part of staging-readiness validation.

## Evidence boundary

Successful local container checks must be reported as **LOCAL/EPHEMERAL**. They do not prove that staging PostgreSQL, private object storage, transactional email, TLS, monitoring, backup/restore, or deployment topology is configured.
EOF
