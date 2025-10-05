from rest_framework import permissions
from django.conf import settings

class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow users with the Admin role.
    """
    def has_permission(self, request, view):
        # Allow if user is authenticated and either has the Admin role
        # or is a Django staff/superuser (useful fallback during admin setup)
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.is_admin() or request.user.is_staff or request.user.is_superuser