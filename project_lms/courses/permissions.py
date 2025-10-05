from rest_framework import permissions
from django.conf import settings

class IsCreatorOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow Creators and Admins to create/edit/delete courses.
    """
    def has_permission(self, request, view):
        # Allow read-only for anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Allow authenticated users to create courses
        if request.method == 'POST':
            return request.user.is_authenticated

        # For other write operations (PUT/PATCH/DELETE), require creator or admin
        if request.user.is_authenticated:
            return request.user.is_creator() or request.user.is_admin()

        return False

    def has_object_permission(self, request, view, obj):
        # Allow read-only for anyone (for course list/detail)
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for the course owner or admin.
        # Support both Course objects (have `creator`) and Lesson objects (have `course.creator`).
        try:
            if hasattr(obj, 'creator'):
                owner = obj.creator
            elif hasattr(obj, 'course') and getattr(obj, 'course') is not None:
                owner = obj.course.creator
            else:
                # Unknown object type; deny write access
                return False

            return owner == request.user or request.user.is_admin()
        except Exception:
            return False