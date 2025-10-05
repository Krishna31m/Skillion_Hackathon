#!/bin/sh
set -e

# Wait for Postgres if needed (optional)
if [ "$DATABASE_HOST" != "" ] && [ "$DATABASE_HOST" != "127.0.0.1" ]; then
  echo "Waiting for database at $DATABASE_HOST:$DATABASE_PORT..."
  until nc -z $DATABASE_HOST $DATABASE_PORT; do
    echo "Waiting for postgres..."
    sleep 1
  done
fi

# Run migrations and collectstatic (run from Django project directory)
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Start the container command
exec "$@"
