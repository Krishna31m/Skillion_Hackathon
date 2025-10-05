from rest_framework import serializers
from .models import User
from django.conf import settings
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserRegisterSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    # Allow clients to suggest a role during registration (1=Learner, 2=Creator)
    role = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'role')
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        # Validate role if provided (do not allow admin role via public registration)
        role = data.get('role')
        if role is not None:
            allowed = (settings.ROLE_LEARNER, settings.ROLE_CREATOR)
            if role not in allowed:
                raise serializers.ValidationError({"role": "Invalid role selection."})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        # Default to Learner if role not provided. Only allow Learner or Creator here.
        role = validated_data.pop('role', None) or settings.ROLE_LEARNER
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=role
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'role_name', 'first_name', 'last_name', 'date_joined')
        read_only_fields = ('role',)


# Custom token serializer to include role information in the login response
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Add custom fields
        data['role'] = self.user.role
        data['role_name'] = self.user.get_role_display()
        data['username'] = self.user.username
        return data