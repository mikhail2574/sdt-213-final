# Core Platform & Admin — starter app

A foundation for the SDT-213 Core Platform & Admin project, Phase II.

## Stack

- Frontend: JavaScript, React 19, HTML5/CSS3, Vite 7
- Backend: Java 17+, Spring Boot, Spring Security, JDBC, MySQL 8.4
- Authentication: BCrypt password hashes, JWT (30-minute absolute expiration)
- API documentation: Springdoc OpenAPI/Swagger at `http://127.0.0.1:8000/docs`

**NFR13 technology stack:** The backend uses Java with Spring Boot and Spring Security, backed by MySQL.

## Run locally

Requires Node.js 20.19+ or 22.12+ and Java 17+, Maven 3.6.3+, and Docker Compose (or an existing MySQL 8.4 server).

### 1) Start the Java backend

```bash
cd backend
docker compose up -d --wait
mvn spring-boot:run
```

MySQL tables are created on startup and populated with six demo accounts when empty. Set `SEED_DEMO=0` to disable demo accounts. The Compose volume preserves data across restarts.

For an existing MySQL server, create a `core_platform` database and configure `DATABASE_URL` (a JDBC URL, e.g. `jdbc:mysql://127.0.0.1:3306/core_platform`), `DATABASE_USER`, and `DATABASE_PASSWORD`. The defaults match the development-only Compose configuration. Set `JWT_SECRET` to a private value of at least 32 bytes; `APP_ENV=production` rejects the default signing key. `PORT` defaults to 8000. Existing SQLite data is not imported automatically; this starts a new MySQL database.

### 2) Start React + Vite (second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` requests to Spring Boot at `http://127.0.0.1:8000`.

### Demo logins

| Role             | Email                        | Password       |
| ---------------- | ---------------------------- | -------------- |
| Administrator    | `admin@coreplatform.dev`     | `admin123`     |
| Student          | `student@coreplatform.dev`   | `student123`   |
| Faculty          | `faculty@coreplatform.dev`   | `faculty123`   |
| Staff / Operator | `staff@coreplatform.dev`     | `staff123`     |
| Staff / Viewer   | `viewer@coreplatform.dev`    | `viewer123`    |
| Applicant        | `applicant@coreplatform.dev` | `applicant123` |

All demo accounts and passwords are **development-only**.

## Implemented now

| Requirement                 | Current implementation                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| FR1                         | Shared sign-in for six seeded accounts; sign-out clears the client token.                        |
| FR5                         | Five failed logins trigger 15-minute lockout; events recorded in database.                       |
| FR7, NFR3                   | Role-sensitive navigation **and** server-side authorization.                                     |
| FR8                         | Dashboard: total / active / administrator / pending user counters, recent audit entries.         |
| FR9, FR10                   | Searchable user list, role and status filters.                                                   |
| FR11 (partial)              | Add a user as `Pending`. **No invitation email is sent.**                                        |
| FR12, FR13, FR20 (partial)  | Edit name / department / status; administrators can change role and console access.              |
| FR19 (partial)              | Read-only role overview.                                                                         |
| FR33, FR34 (partial)        | Immutable-by-API audit entries (login failures and user changes); latest 100 entries for admins. |
| FR31 (partial)              | Health check for the **Core API only**.                                                          |
| NFR6 (partial)              | BCrypt hashed passwords. HTTPS must be configured at deployment.                                 |
| NFR7 (partial)              | JWT expires after 30 minutes **from sign-in**, not 30 minutes of inactivity.                     |
| NFR13                     | Java backend with Spring Boot, Spring Security, and MySQL.                                      |
| NFR12 (partial)             | Versioned REST JSON API at `/api/v1`, auto-generated OpenAPI docs.                               |
| NFR1, NFR2, NFR15 (partial) | Consistent responsive layout down to 360px with labeled controls and keyboard focus.             |

## Not implemented (later phases)

- Real SSO between modules, full API gateway, integration with LMS/SIS/Scheduling/Admissions.
- Password reset and invitation email delivery, applicant self-registration + confirmation.
- Notifications, direct messaging, announcements, reporting/CSV export, system configuration.
- Full permission editor, self-service profile changes, service monitoring and alerts.
- Refresh/revocation/idle-timeout token handling, persistent logout invalidation.
- Production requirements such as HTTPS deployment, audit retention guarantees, migrations, backups, load testing and high availability.

**Do not deploy this starter as a live university system.** Authentication/demo credentials and local development defaults are for demonstration. Audit records are not editable/deletable through the API but are not protected from database administrators. The sign-out flow does not invalidate JWTs server-side.

## Minimal project structure

```text
Core_Platform_Admin_App/
├── backend/
│   ├── pom.xml            # Maven dependencies and executable JAR
│   ├── compose.yaml       # Local MySQL server
│   └── src/
│       ├── main/java/dev/coreplatform/  # API, authentication, error handling
│       ├── main/resources/             # Configuration and database schema
│       └── test/java/dev/coreplatform/ # API regression tests
└── frontend/
    ├── src/
    │   ├── main.jsx       # Pages, forms, API calls
    │   └── styles.css
    ├── vite.config.js
    └── package.json
```

## Test the backend

```bash
cd backend
mvn test
```

Tests use an isolated H2 database in MySQL mode; the application uses MySQL. Run `mvn package` to build `target/core-api-1.0.0.jar`, then `java -jar target/core-api-1.0.0.jar` with MySQL running. This starter is a foundation to be expanded by the team, not a completed submission of FR1–FR37.
