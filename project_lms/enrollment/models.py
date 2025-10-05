import hashlib
from django.db import models
from django.conf import settings
from courses.models import Course, Lesson

class Enrollment(models.Model):
    """
    Tracks a Learner's enrollment in a course.
    """
    learner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments',
        limit_choices_to={'role': settings.ROLE_LEARNER}
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('learner', 'course')
        ordering = ['-enrolled_at']

    def __str__(self):
        return f"{self.learner.username} enrolled in {self.course.title}"

class LessonProgress(models.Model):
    """
    Tracks a Learner's progress on individual lessons.
    """
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='lesson_progress'
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='progress'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('enrollment', 'lesson')

    def __str__(self):
        return f"{self.enrollment.learner.username} progress on {self.lesson.title}"

class Certificate(models.Model):
    """
    Stores the certificate details and the unique serial hash.
    """
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='certificate'
    )
    # The unique, verifiable hash
    serial_hash = models.CharField(max_length=64, unique=True, editable=False)
    issued_at = models.DateTimeField(auto_now_add=True)
    # Certificate metadata / display fields
    title = models.CharField(max_length=255, default='Certificate of Completion')
    recipient_name = models.CharField(max_length=255, blank=True)
    course_title = models.CharField(max_length=255, blank=True)
    course_code = models.CharField(max_length=64, blank=True, null=True)
    issuer_name = models.CharField(max_length=255, blank=True)
    completion_statement = models.TextField(blank=True)
    duration_hours = models.CharField(max_length=64, blank=True)
    grade = models.CharField(max_length=64, blank=True)
    issuer_logo_url = models.URLField(blank=True, null=True)
    signature_text = models.CharField(max_length=255, blank=True)

    def generate_serial_hash(self):
        """Generates a SHA256 hash based on core data for verification."""
        # Data to be hashed: Enrollment ID, User ID, Course ID, Issued Timestamp
        data_string = f"{self.enrollment.id}:{self.enrollment.learner.id}:{self.enrollment.course.id}:{self.issued_at}"
        return hashlib.sha256(data_string.encode('utf-8')).hexdigest()

    def save(self, *args, **kwargs):
        # Populate display fields from related enrollment/course/user when first created
        if not self.pk:
            # Fill recipient and course info if not provided
            try:
                learner = self.enrollment.learner
                course = self.enrollment.course
            except Exception:
                learner = None
                course = None

            if not self.recipient_name and learner:
                full = learner.get_full_name().strip()
                self.recipient_name = full if full else learner.username

            if not self.course_title and course:
                self.course_title = course.title

            if not self.course_code and course:
                self.course_code = getattr(course, 'code', None)

            from django.conf import settings
            issuer_name = getattr(settings, 'CERT_ISSUER_NAME', None)
            if not issuer_name and course and hasattr(course, 'creator'):
                issuer_name = course.creator.get_full_name() or course.creator.username
            if not self.issuer_name and issuer_name:
                self.issuer_name = issuer_name

            if not self.completion_statement and self.recipient_name and self.course_title:
                self.completion_statement = f"This is to certify that {self.recipient_name} has successfully completed the course {self.course_title}."

            # First save to get issued_at and PK
            super().save(*args, **kwargs)

            # Refresh from DB to ensure issued_at and other fields are populated
            self.refresh_from_db()
            # Generate serial_hash and persist only that field to avoid duplicate INSERT
            self.serial_hash = self.generate_serial_hash()
            super().save(update_fields=['serial_hash'])
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"Cert for {self.enrollment.course.title} ({self.serial_hash[:8]}...)"