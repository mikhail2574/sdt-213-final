# Core Platform & Admin

A dependency-free administrative dashboard prototype created for the team project by:

- Mykhailo Naumenko
- Yaroslav Kalinichenko
- Vladyslav Konrad

## Included functionality

- Demo sign-in for Administrator, Student, Faculty, Staff Operator, Staff Viewer, and Applicant roles
- Failed-attempt counting with a five-attempt account lock, sign-out, password-reset request, and simulated applicant registration/email confirmation
- Role-based navigation for the Admin Console and University Portal
- Admin dashboard, user search/filtering, add/edit/activate/deactivate, roles and access, announcements, reports, settings, system status, notifications, and CSV activity export
- University Portal home, notification center/email preferences, messages, directory, profile/password change, faculty reports, and applicant status
- Local activity logging for sign-ins and workflow actions

All changes are stored only in the browser's `localStorage`. No real credentials or personal data are required.

## Run locally

From this folder, run:

```bash
python3 -m http.server 8080 --directory dist
```

Then open:

```text
http://localhost:8080
```

## Tests

The browser logic has a dependency-free Node.js test suite. From this folder, run:

```bash
npm test
```

## Demo credentials

Passwords follow the `role123` pattern:

```text
admin@coreplatform.dev / admin123
student@coreplatform.dev / student123
faculty@coreplatform.dev / faculty123
staff@coreplatform.dev / staff123
viewer@coreplatform.dev / viewer123
applicant@coreplatform.dev / applicant123
```

## Project structure

```text
Core_Platform_Admin_App/
├── dist/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .openai/hosting.json
└── README.md
```

## Notes

This is the Initial Prototype Code for Phase III. It is a front-end demonstration build: authentication, permissions, email confirmation, and persistence are simulated locally and must not be treated as production security controls. The planned production implementation can rebuild these screens with React and move logic to Java Spring Boot, Spring Security/JWT, and MySQL.
