from rest_framework import serializers
from .models import Enrollment, LessonProgress, Certificate
from courses.serializers import CourseSerializer
from courses.models import Course

class EnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    learner_username = serializers.CharField(source='learner.username', read_only=True)
    # Provide completed lesson IDs so frontend can compute progress easily
    completed_lessons = serializers.SerializerMethodField(read_only=True)
    # Include certificate data if present
    certificate = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Enrollment
        fields = ('id', 'course', 'course_title', 'learner', 'learner_username',
                  'enrolled_at', 'is_completed', 'completion_date', 'completed_lessons', 'certificate')
        read_only_fields = ('learner', 'is_completed', 'completion_date')

    def validate_course(self, value):
        # Allow enrollment if the course is published. Also allow enrollment
        # if the course was created by a registered Creator (so learners can
        # enroll in creator courses even if the creator has not published yet).
        from django.conf import settings
        if value.status != Course.STATUS_PUBLISHED and getattr(value.creator, 'role', None) != settings.ROLE_CREATOR:
            raise serializers.ValidationError("Cannot enroll in an unpublished course.")
        return value

    def get_completed_lessons(self, obj):
        # Return a list of lesson IDs marked as completed for this enrollment
        return list(obj.lesson_progress.filter(is_completed=True).values_list('lesson_id', flat=True))

    def get_certificate(self, obj):
        try:
            cert = obj.certificate
            from .serializers import CertificateSerializer
            return CertificateSerializer(cert).data
        except Certificate.DoesNotExist:
            return None

class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = LessonProgress
        fields = ('id', 'enrollment', 'lesson', 'lesson_title', 'is_completed', 'completed_at')
        read_only_fields = ('enrollment', 'lesson', 'completed_at')

class CertificateSerializer(serializers.ModelSerializer):
    learner_username = serializers.CharField(source='enrollment.learner.username', read_only=True)
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)

    class Meta:
        model = Certificate
        fields = (
            'id', 'learner_username', 'recipient_name', 'title', 'course_title', 'course_code',
            'issuer_name', 'completion_statement', 'issued_at', 'serial_hash', 'duration_hours', 'grade',
            'issuer_logo_url', 'signature_text'
        )
        read_only_fields = fields