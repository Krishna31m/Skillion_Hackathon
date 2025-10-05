from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db import IntegrityError
from django.shortcuts import get_object_or_404

from .models import CreatorApplication
from .serializers import CreatorApplicationSerializer
from courses.models import Course

class IsLearner(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_learner()

class IsCreator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_creator()

class ApplyCreatorView(generics.CreateAPIView):
    """
    Learners apply to become a Creator.
    """
    queryset = CreatorApplication.objects.all()
    serializer_class = CreatorApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsLearner]

    def perform_create(self, serializer):
        try:
            # Check if an application already exists
            if CreatorApplication.objects.filter(applicant=self.request.user).exists():
                 raise IntegrityError("You have already submitted a creator application.")
            serializer.save(applicant=self.request.user)
        except IntegrityError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class CreatorDashboardView(generics.GenericAPIView):
    """
    Creator's dashboard summary: course counts.
    """
    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def get(self, request, *args, **kwargs):
        user_courses = Course.objects.filter(creator=request.user)

        data = {
            'total_courses': user_courses.count(),
            'published_courses': user_courses.filter(status=Course.STATUS_PUBLISHED).count(),
            'pending_courses': user_courses.filter(status=Course.STATUS_PENDING).count(),
            'draft_courses': user_courses.filter(status=Course.STATUS_DRAFT).count(),
            # Add more metrics like total enrollments, etc.
        }
        return Response(data, status=status.HTTP_200_OK)