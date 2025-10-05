from django.utils import timezone
from rest_framework import viewsets, mixins, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction

from courses.models import Course
from creator.models import CreatorApplication
from users.models import User
from .permissions import IsAdmin
from .serializers import AdminCourseReviewSerializer, AdminApplicationReviewSerializer
from django.conf import settings

# --- Course Review ViewSet (Approve/Reject) ---

class CourseReviewViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet
):
    """
    Admin endpoint to list PENDING courses and update their status (Approve/Reject).
    """
    queryset = Course.objects.filter(status=Course.STATUS_PENDING)
    serializer_class = AdminCourseReviewSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        # Only allow status change to PUBLISHED or REJECTED
        new_status = serializer.validated_data.get('status')
        if new_status not in [Course.STATUS_PUBLISHED, Course.STATUS_REJECTED]:
             raise ValidationError("Status must be 'Published' or 'Rejected' for review.")

        serializer.save()
        # You could add logging/notification logic here
        return Response(
            {'message': f"Course '{serializer.instance.title}' status updated to {serializer.instance.get_status_display()}."},
            status=status.HTTP_200_OK
        )

# --- Creator Application Review ViewSet (Approve/Reject) ---

class ApplicationReviewViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet
):
    """
    Admin endpoint to list PENDING creator applications and update their status.
    """
    queryset = CreatorApplication.objects.filter(status=CreatorApplication.STATUS_PENDING).select_related('applicant')
    serializer_class = AdminApplicationReviewSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        application = serializer.instance
        new_status = serializer.validated_data.get('status')

        if new_status not in [CreatorApplication.STATUS_APPROVED, CreatorApplication.STATUS_REJECTED]:
            raise ValidationError("Status must be 'Approved' or 'Rejected' for review.")

        with transaction.atomic():
            # Save the application review
            application = serializer.save(status=new_status, reviewed_at=timezone.now(), reviewer=self.request.user)

            # If approved, update the user's role
            if new_status == CreatorApplication.STATUS_APPROVED:
                user = application.applicant
                user.role = settings.ROLE_CREATOR
                user.save(update_fields=['role'])

        return Response(
            {'message': f"Application for {application.applicant.username} updated to {application.get_status_display()}."},
            status=status.HTTP_200_OK
        )