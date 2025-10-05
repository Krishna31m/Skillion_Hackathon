from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class User(AbstractUser):
    """
    Custom User model with a role field.
    """
    ROLE_CHOICES = (
        (settings.ROLE_LEARNER, 'Learner'),
        (settings.ROLE_CREATOR, 'Creator'),
        (settings.ROLE_ADMIN, 'Admin'),
    )

    # Defaults to Learner
    role = models.PositiveSmallIntegerField(
        choices=ROLE_CHOICES,
        default=settings.ROLE_LEARNER
    )

    # Additional fields can be added here
    # e.g., bio = models.TextField(blank=True)

    def is_learner(self):
        return self.role == settings.ROLE_LEARNER

    def is_creator(self):
        return self.role == settings.ROLE_CREATOR

    def is_admin(self):
        return self.role == settings.ROLE_ADMIN

    def __str__(self):
        return self.username