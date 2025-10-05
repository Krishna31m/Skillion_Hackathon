from django.contrib import admin
from .models import Enrollment, LessonProgress, Certificate


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
	list_display = ('learner', 'course', 'enrolled_at', 'is_completed')
	list_filter = ('is_completed', 'course')
	search_fields = ('learner__username', 'course__title')


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
	list_display = ('enrollment', 'lesson', 'is_completed', 'completed_at')
	list_filter = ('is_completed',)
	search_fields = ('enrollment__learner__username', 'lesson__title')


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
	list_display = ('enrollment', 'serial_hash', 'issued_at')
	search_fields = ('serial_hash', 'enrollment__learner__username', 'enrollment__course__title')
