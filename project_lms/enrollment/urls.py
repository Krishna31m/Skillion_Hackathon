from django.urls import path
from .views import (
    EnrollmentListCreateView, EnrollmentDetailView,
    mark_lesson_complete, issue_certificate, CertificateVerifyView,
    render_certificate, render_certificate_pdf, CourseProgressList
)

urlpatterns = [
    # Enrollments
    path('', EnrollmentListCreateView.as_view(), name='enrollment-list-create'),
    path('<int:pk>/', EnrollmentDetailView.as_view(), name='enrollment-detail'),

    # Progress
    path('<int:course_id>/lessons/<int:lesson_id>/complete/',
         mark_lesson_complete, name='lesson-complete'),

     # Creator view: see progress of all learners for a course
     path('<int:course_id>/progress/', CourseProgressList.as_view(), name='course-progress'),

    # Certificates
    path('<int:enrollment_id>/certificate/issue/',
         issue_certificate, name='certificate-issue'),
    path('certificate/verify/<str:serial_hash>/',
         CertificateVerifyView.as_view(), name='certificate-verify'),
    # Public render (printable) certificate view
    path('certificate/render/<str:serial_hash>/',
        render_certificate, name='certificate-render'),
    # PDF render endpoint
    path('certificate/pdf/<str:serial_hash>/', render_certificate_pdf, name='certificate-pdf'),
]
