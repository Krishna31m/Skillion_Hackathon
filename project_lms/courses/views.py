import hashlib
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Course, Lesson
from .serializers import CourseSerializer, CourseDetailSerializer, LessonSerializer, TranscriptMockSerializer
from .permissions import IsCreatorOrAdmin
from core.permissions import IsAdminOrReadOnly # Will be defined in core/permissions.py
from django.db.models import Q

# Simple mock function for transcript generation
def generate_transcript_mock(content):
    """Mocks an external service call for transcript generation."""
    return f"[TRANSCRIPT MOCK] Analysis of content (len: {len(content)}). Key phrases: {content[:30]}..."

class CourseViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing Course instances.
    CRUD for courses. Public list, restricted write access.
    """
    queryset = Course.objects.all().select_related('creator')
    permission_classes = [IsAuthenticated, IsCreatorOrAdmin]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    def get_queryset(self):
        # For authenticated users, allow viewing their draft/pending courses
        if self.action in ['list', 'retrieve']:
            user = self.request.user
            # If a creator query param is provided, filter by that creator.
            creator_id = self.request.query_params.get('creator')
            if creator_id:
                # Return all courses for the specified creator. The frontend can decide
                # whether to allow enrollment or not; we expose the full list to learners
                # so they can view and choose to enroll.
                qs = self.queryset.filter(creator__id=creator_id)
                return qs.distinct()

            # No creator filter: default behavior
            if user.is_authenticated and (user.is_creator() or user.is_admin()):
                return self.queryset.filter(
                    Q(status=Course.STATUS_PUBLISHED) | Q(creator=user)
                ).distinct()
            # If the user is a learner, let them view all courses created by creators
            if user.is_authenticated and user.is_learner():
                from django.conf import settings
                return self.queryset.filter(creator__role=settings.ROLE_CREATOR).distinct()
            # Public view: only published courses
            return self.queryset.filter(status=Course.STATUS_PUBLISHED)
        return self.queryset

    def perform_create(self, serializer):
        # Automatically set the creator to the authenticated user
        serializer.save(creator=self.request.user)

    @action(detail=False, methods=['GET'], url_path='my-courses')
    def my_courses(self, request):
        """List courses created by the authenticated user, regardless of status."""
        my_courses = self.queryset.filter(creator=request.user)
        serializer = self.get_serializer(my_courses, many=True)
        return Response(serializer.data)


class LessonViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for managing Lessons within a specific Course.
    """
    serializer_class = LessonSerializer
    # Uses course permission since lesson management is tied to course ownership
    permission_classes = [IsAuthenticated, IsCreatorOrAdmin]

    def get_queryset(self):
        # Lessons are always filtered by the course_pk in the URL
        return Lesson.objects.filter(course_id=self.kwargs['course_pk'])

    def perform_create(self, serializer):
        course = Course.objects.get(pk=self.kwargs['course_pk'])
        # Check permission that the user owns the course
        if course.creator != self.request.user and not self.request.user.is_admin():
            self.permission_denied(self.request, message="You are not the creator of this course.")

        # Set the course and determine the next order
        last_lesson = Lesson.objects.filter(course=course).order_by('-order').first()
        next_order = (last_lesson.order if last_lesson else 0) + 1

        serializer.save(course=course, order=next_order)

    @action(detail=True, methods=['post'])
    def generate_transcript(self, request, course_pk=None, pk=None):
        """Mock auto-generation of the lesson transcript."""
        try:
            lesson = self.get_object()
        except Lesson.DoesNotExist:
            return Response({'detail': 'Lesson not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Mock the generation process
        transcript_text = generate_transcript_mock(lesson.content)

        lesson.transcript = transcript_text
        lesson.save(update_fields=['transcript'])

        serializer = TranscriptMockSerializer(data={})
        serializer.is_valid()

        return Response(
            {"message": "Transcript generated successfully.", "transcript": transcript_text},
            status=status.HTTP_200_OK
        )