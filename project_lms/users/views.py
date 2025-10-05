from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserRegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer
from .models import User

# JWT Login (uses standard SimpleJWT TokenObtainPairView)
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Use a custom serializer to include role info in the token response.
    """
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    """
    Endpoint for new user registration (Learner role).
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        # Return serialized user including role info
        user_data = UserSerializer(serializer.instance).data
        return Response(
            {"message": "Registration successful. You can now log in.", "user": user_data},
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the authenticated user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user