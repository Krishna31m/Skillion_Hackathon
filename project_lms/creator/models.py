from django.db import models
from django.conf import settings

class CreatorApplication(models.Model):
    """
    Model to track applications from Learners to become Creators.
    """
    STATUS_PENDING = 1
    STATUS_APPROVED = 2
    STATUS_REJECTED = 3

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    )

    applicant = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='creator_application',
        limit_choices_to={'role': settings.ROLE_LEARNER}
    )
    motivation = models.TextField(help_text="Why do you want to be a creator?")
    status = models.PositiveSmallIntegerField(
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_applications',
        limit_choices_to={'role': settings.ROLE_ADMIN}
    )

    def __str__(self):
        return f"Application from {self.applicant.username} ({self.get_status_display()})"