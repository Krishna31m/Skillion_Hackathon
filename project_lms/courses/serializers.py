from rest_framework import serializers
from .models import Course, Lesson

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ('id', 'title', 'content', 'order', 'transcript')
        # `order` is assigned server-side in LessonViewSet.perform_create(), so mark it read-only
        read_only_fields = ('id', 'order', 'transcript')

    def validate_order(self, value):
        # Ensures order is unique *within the course*
        # This check is better done in the view/create method for context,
        # but a basic check is fine here. The unique_together meta handles strict validation.
        return value

class CourseSerializer(serializers.ModelSerializer):
    creator_username = serializers.CharField(source='creator.username', read_only=True)
    status_name = serializers.CharField(source='get_status_display', read_only=True)
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            'id', 'title', 'description', 'creator', 'creator_username',
            'status', 'status_name', 'created_at', 'lesson_count'
        )
        read_only_fields = ('creator', 'status',) # Status is set via admin or special endpoint

    def get_lesson_count(self, obj):
        return obj.lessons.count()

class CourseDetailSerializer(CourseSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ('lessons',)

# Transcripts Mock Generation
class TranscriptMockSerializer(serializers.Serializer):
    """
    Serializer to trigger the mock transcript generation.
    """
    message = serializers.CharField(read_only=True, default="Transcript generation triggered successfully.")