from django.urls import path, include
from rest_framework_nested import routers
from .views import CourseViewSet, LessonViewSet

# Register at the root so the list/create endpoints are at /api/v1/courses/
router = routers.SimpleRouter()
router.register(r'', CourseViewSet, basename='course')

# Nested router for lessons - attach to the root router so lessons are available
# at /api/v1/courses/{course_pk}/lessons/
lessons_router = routers.NestedSimpleRouter(router, r'', lookup='course')
lessons_router.register(r'lessons', LessonViewSet, basename='course-lessons')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(lessons_router.urls)),
]

# Backwards-compatible alias: mount the list/create actions under 'list/'
# so older clients that POST to /api/v1/courses/list/ continue to work.
course_list_alias = CourseViewSet.as_view({'get': 'list', 'post': 'create'})
course_detail_alias = CourseViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

urlpatterns += [
    path('list/', course_list_alias, name='course-list-alias'),
    path('list/<int:pk>/', course_detail_alias, name='course-detail-alias'),
]