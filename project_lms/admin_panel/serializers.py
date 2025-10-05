from rest_framework import serializers
from courses.models import Course
from creator.models import CreatorApplication
from users.models import User
from django.conf import settings

class AdminCourseReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for Admin to approve/reject courses.
    """
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    current_status = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Course
        fields = ('id', 'title', 'creator_username', 'status', 'current_status', 'created_at')
        read_only_fields = ('title', 'creator_username', 'created_at')

    # Status must be one of the final states for review
    status = serializers.ChoiceField(
        choices=[
            (Course.STATUS_PUBLISHED, 'Published'),
            (Course.STATUS_REJECTED, 'Rejected'),
        ]
    )


class AdminApplicationReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for Admin to approve/reject creator applications.
    """
    applicant_username = serializers.CharField(source='applicant.username', read_only=True)

    class Meta:
        model = CreatorApplication
        fields = ('id', 'applicant', 'applicant_username', 'motivation', 'status')
        read_only_fields = ('applicant', 'motivation')

    # Status must be one of the final states for review
    status = serializers.ChoiceField(
        choices=[
            (CreatorApplication.STATUS_APPROVED, 'Approved'),
            (CreatorApplication.STATUS_REJECTED, 'Rejected'),
        ]
    )