# core/permissions.py

from rest_framework import permissions
from django.conf import settings

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow read-only access to all authenticated users,
    but only allow Admins to perform write operations (POST, PUT, DELETE).
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any request (GET, HEAD, OPTIONS).
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to Admin users.
        return request.user.is_authenticated and request.user.is_admin()