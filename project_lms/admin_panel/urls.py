from django.urls import path, include
from rest_framework import routers
from .views import CourseReviewViewSet, ApplicationReviewViewSet

router = routers.SimpleRouter()
router.register(r'course-review', CourseReviewViewSet, basename='admin-course-review')
router.register(r'creator-applications', ApplicationReviewViewSet, basename='admin-creator-applications')

urlpatterns = [
    path('', include(router.urls)),
]