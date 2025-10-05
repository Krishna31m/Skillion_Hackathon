from django.db import models
from django.conf import settings

class Course(models.Model):
    """
    Main model for a course.
    """
    STATUS_DRAFT = 1
    STATUS_PENDING = 2
    STATUS_PUBLISHED = 3
    STATUS_REJECTED = 4

    STATUS_CHOICES = (
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_REJECTED, 'Rejected'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_courses',
        limit_choices_to={'role': settings.ROLE_CREATOR}
    )
    status = models.PositiveSmallIntegerField(
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

class Lesson(models.Model):
    """
    Individual lessons within a course.
    """
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='lessons'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    # Unique order within the course
    order = models.PositiveIntegerField()

    # Mock field for auto-generation of transcript
    transcript = models.TextField(
        blank=True,
        help_text="Auto-generated text from the content."
    )

    class Meta:
        unique_together = ('course', 'order')
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.order}. {self.title}"