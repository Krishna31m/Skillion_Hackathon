from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    """
    Custom exception handler to format all DRF errors into a consistent structure.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        # Custom format for errors
        custom_response_data = {
            'error': True,
            'code': response.status_code,
            'message': str(exc),
            'details': response.data
        }

        # Handle specific DRF exception types for cleaner messages
        if isinstance(response.data, dict) and 'detail' in response.data:
            # e.g., for NotAuthenticated, PermissionDenied
            custom_response_data['message'] = response.data['detail']
            custom_response_data['details'] = None
        elif isinstance(response.data, list):
            # e.g., for validation errors on a list of items
            custom_response_data['message'] = 'One or more validation errors occurred.'
        elif isinstance(response.data, dict):
             # General validation errors
            custom_response_data['message'] = 'Input validation failed.'


        response.data = custom_response_data

    return response