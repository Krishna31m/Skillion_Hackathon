Deployment guide (local Docker)

Prerequisites
- Docker and Docker Compose installed
- Copy `.env.example` to `.env` and fill values

Quick start (local):

# Build and start services
docker compose up --build

# The API will be available at http://localhost:8000

Notes:
- The entrypoint runs migrations and collectstatic automatically.
- For production, set `DJANGO_DEBUG=False` and provide a strong `DJANGO_SECRET_KEY`.
- Consider using managed Postgres or external Redis for production caches and rate limiting.
