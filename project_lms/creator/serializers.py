from rest_framework import serializers
from .models import CreatorApplication

class CreatorApplicationSerializer(serializers.ModelSerializer):
    applicant_username = serializers.CharField(source='applicant.username', read_only=True)
    status_name = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CreatorApplication
        fields = (
            'id', 'applicant', 'applicant_username', 'motivation',
            'status', 'status_name', 'applied_at'
        )
        read_only_fields = ('applicant', 'status', 'reviewed_at', 'reviewer')

    def validate_applicant(self, value):
        # Additional check to ensure only Learners can apply (Model field already limits this)
        if not value.is_learner():
            raise serializers.ValidationError("Only users with the Learner role can apply.")
        return value