# Core Platform & Admin

A dependency-free administrative dashboard prototype created for the team project by:

- Mykhailo Naumenko
- Yaroslav Kalinichenko
- Vladyslav Konrad

## Included functionality

- Demo sign-in flow
- Operational dashboard with platform metrics
- User search, role/status filtering, and local user creation
- Account activation and deactivation
- Role and permission overview
- Service-health monitoring
- Administrative activity log
- Responsive desktop and mobile layout

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

## Demo credentials

```text
Email: admin@coreplatform.dev
Password: admin123
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

This is a front-end demonstration build. Authentication, permissions, and persistence are simulated locally and must not be treated as production security controls.
