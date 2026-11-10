# Core Platform & Admin

Spring Boot REST backend for the SDT-213 university platform, with the original React prototype.
Requirements and implementation coverage: [BACKEND_DESIGN.md](BACKEND_DESIGN.md).

## Stack and local start

Java 17+ **JDK**, Maven 3.6.3+, MySQL 8.4; React 19 / Vite 7 with Node 20.19+ or 22.12+.

```sh
cd backend
docker compose up -d --wait
mvn spring-boot:run
```

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

Frontend: http://127.0.0.1:5173. Backend: http://127.0.0.1:8000.
Swagger: http://127.0.0.1:8000/docs; OpenAPI: `/v3/api-docs`.
Vite proxies `/api` to the backend. API base: `/api/v1`.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | admin@coreplatform.dev | admin123 |
| Student | student@coreplatform.dev | student123 |
| Faculty | faculty@coreplatform.dev | faculty123 |
| Staff / Operator | staff@coreplatform.dev | staff123 |
| Staff / Viewer | viewer@coreplatform.dev | viewer123 |
| Applicant | applicant@coreplatform.dev | applicant123 |

Demo accounts are for local development. Set `SEED_DEMO=0` to disable seeding.
Set `JWT_SECRET` to a private value of at least 32 bytes; `APP_ENV=production` rejects the default.

## Backend features

- BCrypt sign-in, configurable lockout, persistent revocable JWT sessions, sign-out and password change.
- Applicant registration/confirmation, expiring single-use reset/invitation links, SMTP outbox/retry.
- Profile editing, email preferences, paginated user management and scoped public directory.
- Database permissions, protected role assignments and last-administrator checks.
- Scoped SIS account synchronization through server-only module credentials.
- Notifications, read state, announcement fan-out, course and office groups, and scoped message history.
- Atomic settings and module switches, background module health snapshots and administrator alerts.
- Filtered audit history and CSV; durable ordered audit queue, MySQL immutability triggers, report aggregation with explicit missing-module data and CSV.
- Configured module proxy with timeouts, bounded payloads and editable route permissions.
- One-time module launch tickets, module-bound tokens and module-side token introspection.
- Validated private profile photo storage and internal subsystem health probes.

The React UI remains a prototype and does not expose all backend workflows. Use the versioned API
or Swagger for registration, recovery, groups, announcements, reports and settings.
The existing `/admin/users` routes stay compatible; new consumers should use paginated `/users`.

## Configuration

`DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD` configure an existing MySQL database.
The defaults match `backend/compose.yaml`; `PORT` defaults to 8000.

Email is **queued but not delivered by default**. For local email testing:

```sh
cd backend
docker compose --profile mail up -d
```

Set `MAIL_ENABLED=true`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` before starting Spring Boot.
View captured email at http://127.0.0.1:8025 ([Mailpit Docker documentation](https://mailpit.axllent.org/docs/install/docker/)). `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_AUTH` and
`SMTP_STARTTLS` configure a real SMTP provider. Sender address is in platform settings.
`EMAIL_LINK_BASE` defaults to `http://127.0.0.1:5173/email-link`; the React prototype
has no email-link screen, so redeem captured tokens via `POST /api/v1/auth/email-link`.
Never expose the outbox through a public API.

For each of `SIS`, `LMS`, `SCHEDULING`, `ADMISSIONS`, set `<CODE>_MODULE_URL` and a distinct
random `<CODE>_MODULE_KEY` on trusted servers. Empty keys authorize nobody. Module keys are
accepted on documented server integration routes, including group synchronization, token exchange and
introspection. They must never be placed in frontend code. Set `<CODE>_MODULE_WEB_URL` to the
HTTPS landing page for one-time module launch. Adapter contracts are in BACKEND_DESIGN.md.

## Migrations and tests

Flyway validates and applies migrations V1-V8 on startup (V7 is MySQL-specific). Add a new migration instead of editing
an applied version. Demo data loads separately, only when the users table is empty.

For databases created by the old `schema.sql` prototype: back up first, confirm the original
`users`/`audit_entries` tables, then start once with `FLYWAY_BASELINE_ON_MIGRATE=true` (baseline 0).
Remove the override afterward. Invalid legacy role/status/access data must be fixed before V2.

```sh
cd backend
mvn test
mvn package
```

Tests use isolated H2 databases in MySQL mode. MySQL 8.4 migration and trigger checks, real
SMTP/module integration and load testing remain necessary before deployment. Previously issued
JWTs without persisted SQL sessions are rejected; sign in again.

## Remaining requirements

The REST API implements the specified local workflows. Production integration still requires other
teams to implement and agree the module adapters, trust the introspection contract, provision distinct
module keys and URLs, and verify course ownership end to end. The React prototype needs dedicated
screens for the newer workflows. Deployment must provide HTTPS, ingress rate limits, secure secrets,
scheduled encrypted backups and restore drills, plus availability and performance validation. See
BACKEND_DESIGN.md for the use-case traceability and precise limits of the implementation.
