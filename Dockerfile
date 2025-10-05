# Use official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set workdir

# Set working directory to the repo root first, then later we'll use the Django project
WORKDIR /code

# Install system deps
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt /code/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project
COPY . /code/

# Change working directory to the Django project folder (where manage.py lives)
WORKDIR /code/project_lms

# Collect static, run migrations will be done in entrypoint

# Expose port
EXPOSE 8000

# Entrypoint
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "project_lms.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
