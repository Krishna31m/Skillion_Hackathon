from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Enrollment, LessonProgress, Certificate
from .serializers import EnrollmentSerializer, LessonProgressSerializer, CertificateSerializer
from courses.models import Course
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django.template.loader import render_to_string
from django.http import HttpResponse
import io
import logging
try:
    # ReportLab used for server-side PDF generation
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor
    REPORTLAB_AVAILABLE = True
except Exception:
    REPORTLAB_AVAILABLE = False

class IsLearner(permissions.BasePermission):
    """Custom permission to only allow Learners to access enrollment features."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_learner()

class EnrollmentListCreateView(generics.ListCreateAPIView):
    """
    List user's enrollments or create a new enrollment.
    Learners only.
    """
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsLearner]

    def get_queryset(self):
        return Enrollment.objects.filter(learner=self.request.user)

    def perform_create(self, serializer):
        try:
            # Enforce unique_together('learner', 'course')
            Enrollment.objects.get(learner=self.request.user, course=serializer.validated_data['course'])
            raise ValidationError({'course': 'You are already enrolled in this course.'})
        except Enrollment.DoesNotExist:
            pass

        # Allow enrollment if the course is created by a creator (even if not published),
        # otherwise enforce published-only rule.
        course = serializer.validated_data['course']
        from django.conf import settings
        if course.status != Course.STATUS_PUBLISHED and course.creator.role != settings.ROLE_CREATOR:
            raise ValidationError({'course': 'Cannot enroll in an unpublished course.'})

        serializer.save(learner=self.request.user)

class EnrollmentDetailView(generics.RetrieveAPIView):
    """Retrieve a single enrollment detail."""
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsLearner]

    def get_queryset(self):
        return Enrollment.objects.filter(learner=self.request.user)

# --- Lesson Progress & Completion ---

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLearner])
def mark_lesson_complete(request, course_id, lesson_id):
    """
    Endpoint to mark a specific lesson in an enrolled course as complete.
    """
    course = get_object_or_404(Course, pk=course_id)
    enrollment = get_object_or_404(Enrollment, learner=request.user, course=course)
    lesson = get_object_or_404(course.lessons, pk=lesson_id) # Ensure lesson belongs to the course

    # Get or create the progress record
    progress, created = LessonProgress.objects.get_or_create(
        enrollment=enrollment,
        lesson=lesson,
        defaults={'is_completed': True, 'completed_at': timezone.now()}
    )

    if not created and progress.is_completed:
        return Response({'message': 'Lesson already marked as complete.'}, status=status.HTTP_200_OK)

    # If it was created, or if it wasn't completed before
    if not progress.is_completed:
        progress.is_completed = True
        progress.completed_at = timezone.now()
        progress.save()

    # Check for course completion
    total_lessons = course.lessons.count()
    completed_lessons = enrollment.lesson_progress.filter(is_completed=True).count()

    if total_lessons > 0 and completed_lessons == total_lessons and not enrollment.is_completed:
        enrollment.is_completed = True
        enrollment.completion_date = timezone.now()
        enrollment.save()
        # Auto-issue certificate
        certificate = None
        if not hasattr(enrollment, 'certificate'):
            certificate = Certificate.objects.create(enrollment=enrollment)
            certificate.save()
        else:
            certificate = enrollment.certificate

        message = 'Lesson marked complete. Course also completed! Certificate issued.'
    else:
        message = 'Lesson marked complete.'

    return Response(
        {'message': message, 'progress': LessonProgressSerializer(progress).data, 'certificate': CertificateSerializer(certificate).data if enrollment.is_completed else None},
        status=status.HTTP_200_OK
    )

# --- Certificate Issuance and Verification ---

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLearner])
def issue_certificate(request, enrollment_id):
    """
    Issue a certificate for a completed enrollment.
    """
    enrollment = get_object_or_404(Enrollment, pk=enrollment_id, learner=request.user)

    if not enrollment.is_completed:
        return Response(
            {'error': 'Course not yet completed. Complete all lessons first.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if certificate already exists
    if hasattr(enrollment, 'certificate'):
        return Response(
            {'message': 'Certificate already issued.', 'certificate': CertificateSerializer(enrollment.certificate).data},
            status=status.HTTP_200_OK
        )

    # Issue new certificate
    certificate = Certificate.objects.create(enrollment=enrollment)
    # The hash generation happens in the model's save method
    certificate.save()

    return Response(
        {'message': 'Certificate issued successfully!', 'certificate': CertificateSerializer(certificate).data},
        status=status.HTTP_201_CREATED
    )

class CertificateVerifyView(generics.RetrieveAPIView):
    """
    Public endpoint to verify a certificate using its SHA256 serial hash.
    """
    queryset = Certificate.objects.all()
    serializer_class = CertificateSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'serial_hash'

    def get(self, request, *args, **kwargs):
        try:
            certificate = self.get_object()
        except Certificate.DoesNotExist:
            return Response({'is_valid': False, 'message': 'Certificate hash not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Re-verify the hash to ensure integrity
        # Note: The issued_at time might be slightly different on re-creation,
        # so this is a simplified check. In production, the save() method ensures
        # the hash is stored correctly once.
        if certificate.serial_hash == certificate.generate_serial_hash():
            return Response(
                {
                    'is_valid': True,
                    'message': 'Certificate verified successfully.',
                    'certificate': self.get_serializer(certificate).data
                },
                status=status.HTTP_200_OK
            )
        else:
             # Should rarely happen unless data is tampered with
             return Response({'is_valid': False, 'message': 'Certificate data integrity compromised.'}, status=status.HTTP_400_BAD_REQUEST)


# Public render endpoint for printable certificates
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def render_certificate(request, serial_hash):
    try:
        certificate = Certificate.objects.get(serial_hash=serial_hash)
    except Certificate.DoesNotExist:
        # Try prefix match in case frontend passed a short id
        try:
            certificate = Certificate.objects.filter(serial_hash__startswith=serial_hash).first()
            if not certificate:
                return HttpResponse('Certificate not found', status=404)
        except Exception:
            return HttpResponse('Certificate not found', status=404)

    # Render a simple HTML certificate template
    html = render_to_string('enrollment/certificate.html', {'certificate': certificate})
    return HttpResponse(html)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def render_certificate_pdf(request, serial_hash):
    """
    Return a PDF version of the certificate. Uses ReportLab when available.
    Falls back to the HTML render if ReportLab isn't installed.
    """
    logger = logging.getLogger(__name__)
    logger.info(f"Certificate PDF requested: {serial_hash}")
    try:
        certificate = Certificate.objects.get(serial_hash=serial_hash)
        logger.info("Exact match found for certificate")
    except Certificate.DoesNotExist:
        # Try prefix match to be tolerant of short ids
        certificate = Certificate.objects.filter(serial_hash__startswith=serial_hash).first()
        if not certificate:
            logger.warning(f"Certificate not found for: {serial_hash}")
            return HttpResponse('Certificate not found', status=404)
        logger.info(f"Prefix match used for certificate: {certificate.serial_hash}")

    if not REPORTLAB_AVAILABLE:
        # Fall back to HTML render
        html = render_to_string('enrollment/certificate.html', {'certificate': certificate})
        return HttpResponse(html)

    # Create PDF
    buffer = io.BytesIO()
    page_size = landscape(A4)
    c = canvas.Canvas(buffer, pagesize=page_size)
    width, height = page_size

    # Simple centered layout
    accent = HexColor('#0ea5e9')
    c.setFillColor(accent)
    c.setFont('Times-Bold', 36)
    c.drawCentredString(width/2, height - 100, certificate.title or 'Certificate of Completion')

    c.setFillColor(HexColor('#111827'))
    c.setFont('Times-Roman', 14)
    c.drawCentredString(width/2, height - 140, 'This is to certify that')

    # Recipient name
    c.setFont('Times-Bold', 32)
    c.drawCentredString(width/2, height - 190, certificate.recipient_name or '')

    # Course title
    c.setFont('Times-Roman', 16)
    course_line = certificate.course_title or ''
    if certificate.course_code:
        course_line = f"{course_line} ({certificate.course_code})"
    c.drawCentredString(width/2, height - 230, f"has successfully completed the course: {course_line}")

    # Meta block
    c.setFont('Times-Roman', 12)
    left_x = 80
    right_x = width - 80
    c.drawString(left_x, height - 300, f"Date of completion: {certificate.issued_at.strftime('%B %d, %Y') if certificate.issued_at else ''}")
    if certificate.duration_hours:
        c.drawString(left_x, height - 320, f"Duration: {certificate.duration_hours}")
    if certificate.grade:
        c.drawString(left_x, height - 340, f"Achievement: {certificate.grade}")

    c.drawRightString(right_x, height - 300, f"Issued by: {certificate.issuer_name}")
    c.drawRightString(right_x, height - 320, f"Certificate ID: {certificate.serial_hash}")

    # Signatures
    sig_y = height - 420
    c.line(left_x, sig_y, left_x + 220, sig_y)
    c.drawString(left_x, sig_y - 14, certificate.signature_text or '(Signature) — Instructor')

    c.line(right_x - 220, sig_y, right_x, sig_y)
    c.drawString(right_x - 220, sig_y - 14, 'Director — Krishna')

    c.showPage()
    c.save()

    buffer.seek(0)
    return HttpResponse(buffer.getvalue(), content_type='application/pdf')


# --- Creator access to learner progress for a course ---
class IsCreatorOrAdmin(permissions.BasePermission):
    """Allow access if user is creator of the course or admin."""
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # obj here will be a Course instance when used
        return (obj.creator == request.user) or request.user.is_admin()


class CourseProgressList(generics.ListAPIView):
    """List all lesson progress records for a given course (creator/admin only)."""
    serializer_class = LessonProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        course_id = self.kwargs.get('course_id')
        course = get_object_or_404(Course, pk=course_id)

        # Ensure requester is course creator or admin
        if not (course.creator == self.request.user or self.request.user.is_admin()):
            raise PermissionDenied('You do not have permission to view progress for this course.')

        # Optionally filter by learner id
        learner_id = self.request.query_params.get('learner_id')
        qs = LessonProgress.objects.filter(enrollment__course=course).select_related('enrollment', 'lesson')
        if learner_id:
            qs = qs.filter(enrollment__learner__id=learner_id)
        return qs