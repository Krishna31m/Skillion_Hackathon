Heroku deployment notes

1. Create a Heroku app and add Heroku Postgres add-on.
2. Set config vars (in Heroku Dashboard > Settings > Config Vars):
   - DJANGO_SECRET_KEY
   - DJANGO_DEBUG=False
   - DJANGO_ALLOWED_HOSTS=yourdomain.com
   - DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, DATABASE_PORT (if not using DATABASE_URL)
   - Or set DATABASE_URL to Heroku-provided URL
3. Deploy by connecting GitHub repo or pushing to Heroku remote:
   git push heroku main
4. Run migrations and collectstatic:
   heroku run python project_lms/manage.py migrate
   heroku run python project_lms/manage.py collectstatic --noinput
