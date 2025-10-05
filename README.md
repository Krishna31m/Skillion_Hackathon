# Skillion_Hackathon — Learning Management System (LMS)

This repository contains a full-stack Learning Management System project built with Django (REST API) and a Vite + React frontend. The backend provides secure JWT authentication, course and lesson management, enrollment and progress tracking, certificate issuance, and an admin panel for reviewing content and creator applications.

This README documents the project stack, features, API endpoints, development setup, Docker usage, and deployment notes.

## Stack

- Backend: Django 5.2 (Django REST Framework, Simple JWT, CORS)
- Frontend: React (Vite)
- Database: SQLite (development) / PostgreSQL (recommended for production)
- Authentication: JSON Web Tokens (djangorestframework-simplejwt)
- Static files: WhiteNoise (serving via Django) or S3 + CDN in production
- Containerization: Docker + docker-compose (Postgres service included)

## Key Features

- User registration, login, profile
- JWT-based authentication with access and refresh tokens
- Course CRUD with nested lessons (DRF viewsets + nested routers)
- Enrollment endpoints and lesson completion tracking
- Certificate issuance, verification, and rendering (PDF and HTML endpoints)
- Creator application and dashboard
- Admin panel endpoints for course and creator application reviews
- Middleware for idempotency and rate limiting (in-memory by default; swap to Redis for production)
- Pagination, custom exception handling and centralised API patterns via DRF

## API Overview

Base API path: `/api/v1/`

Auth (`/api/v1/users/`):
- `POST /register/` — register a new user
- `POST /login/` — obtain JWT access & refresh tokens
- `POST /token/refresh/` — refresh access token
- `GET /profile/` — get authenticated user's profile

Courses (`/api/v1/courses/`):
- `GET /` — list courses
- `POST /` — create a course (creator/admin)
- `GET /{id}/` — retrieve course details
- `PUT/PATCH/DELETE /{id}/` — update or delete
- Nested: `GET /{course_id}/lessons/` — list lessons for course
- `POST /{course_id}/lessons/` — create lesson for course

Compatibility aliases:
- `/api/v1/courses/list/` and `/api/v1/courses/list/{id}/` are available for backward compatibility.

Enrollment (`/api/v1/enrollment/`):
- `GET /` and `POST /` — list and create enrollments
- `GET /{id}/` — enrollment detail
- `POST /{course_id}/lessons/{lesson_id}/complete/` — mark lesson complete for authenticated user
- `GET /{course_id}/progress/` — (creator) view course progress of learners
- Certificate endpoints:
	- `POST /{enrollment_id}/certificate/issue/` — issue certificate for an enrollment
	- `GET /certificate/verify/{serial_hash}/` — verify a certificate
	- `GET /certificate/render/{serial_hash}/` — render certificate as HTML
	- `GET /certificate/pdf/{serial_hash}/` — download certificate PDF

Creator (`/api/v1/creator/`):
- `POST /apply/` — apply to be a creator
- `GET /dashboard/` — creator dashboard (courses, earnings, progress)

Admin Panel (`/api/v1/admin/`):
- `GET/POST/PUT/DELETE /course-review/` — review courses
- `GET/POST/PUT/DELETE /creator-applications/` — review creator applications

Note: All endpoints (unless explicitly public) are protected and require authentication using the `Authorization: Bearer <access_token>` header.

## Local development

Prerequisites:
- Python 3.11
- Node.js and npm
- Docker (optional, for PostgreSQL and running the full stack locally)

Backend (local dev, sqlite):

1. Create and activate a virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install Python dependencies

```powershell
pip install -r requirements.txt
```

3. Configure environment variables (create `.env` from `.env.example` and set `DJANGO_SECRET_KEY` and `DJANGO_DEBUG=True` for local dev)

4. Run migrations and start the dev server

```powershell
python project_lms\manage.py migrate
python project_lms\manage.py runserver
```

Frontend (local):

```powershell
cd project_lms\lms-frontend
npm ci
npm run dev
```

Open http://localhost:3000 (or the port Vite prints) for frontend and http://127.0.0.1:8000 for backend.

## Docker (local full stack)

I included a `Dockerfile`, `docker-compose.yml`, and `entrypoint.sh` to run the backend with Postgres. Basic usage:

```powershell
# from repo root
docker compose up --build
```

This will:
- Build the backend image
- Start a Postgres container
- Run migrations and collectstatic (via entrypoint)
- Start Gunicorn serving the Django app at port 8000

## Deployment notes

- Frontend: Vercel — set project root to `project_lms/lms-frontend`, build command `npm run build`, output `dist`. Set Vite env vars (prefix `VITE_`) such as `VITE_API_BASE` to point to your backend URL.
- Backend: Render / Heroku / Railway / Fly / Cloud Run — pick a Python host. Important env vars to set (see `.env.example`):
	- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS` (comma-separated)
	- `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_HOST`, `DATABASE_PORT`
	- `DJANGO_SECURE_SSL_REDIRECT`, `DJANGO_SECURE_HSTS_SECONDS` (optional)

If using Render or Heroku, set the start command:

```
gunicorn project_lms.wsgi:application --bind 0.0.0.0:$PORT
```

## Environment variables

Minimum for production:

- DJANGO_SECRET_KEY: strong secret
- DJANGO_DEBUG: False
- DJANGO_ALLOWED_HOSTS: yourdomain.com
- DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, DATABASE_PORT (or a single DATABASE_URL)

Optional:
- REDIS_URL: for caching, rate limiting, idempotency support
- SENTRY_DSN: for error reporting
- AWS_*: if using S3 for static/media

## Tests & health checks

Run basic Django checks and tests:

```powershell
python project_lms\manage.py check
python project_lms\manage.py test
```

## Notes about code & architecture

- Authentication: implemented with `rest_framework_simplejwt` (access/refresh tokens). Token lifetimes are configured in `settings.py`.
- Nested resources: courses and lessons use `rest_framework_nested` routers so lessons are scoped under a course resource.
- Certificates: endpoints are provided to issue, verify, render (HTML + PDF) certificates. The PDF rendering endpoint returns a downloadable PDF.
- Admin & Creator flows: creators can apply via `/api/v1/creator/apply/` and admins review via the admin panel endpoints.
- Rate limiting and idempotency middleware are provided in `core.middleware` using in-memory stores for development. For production, replace these with Redis-backed stores.

## Where to find things in the repo

- Backend Django project: `project_lms/project_lms/`
- Django apps: `project_lms/users`, `project_lms/courses`, `project_lms/enrollment`, `project_lms/creator`, `project_lms/admin_panel`, `project_lms/core`
- Frontend: `project_lms/lms-frontend/`
- Docker files: `Dockerfile`, `docker-compose.yml`, `entrypoint.sh`
- Example env file: `.env.example`

## Next improvements (suggested)

- Move rate-limit and idempotency caches to Redis for multi-process deployments.
- Configure S3 + CDN for static/media hosting at scale.
- Add CI (GitHub Actions) to run tests and build frontend on PRs and push to production.
- Add monitoring (Sentry) and performance metrics.

---

If you'd like, I can commit this README update and push it to your repository (I can do that now), or I can also open a PR with additional production hardening (Redis integration, Heroku Procfile, GitHub Actions). Which would you like next?
