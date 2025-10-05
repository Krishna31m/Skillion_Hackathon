from django.contrib import admin
from .models import Course, Lesson


class LessonInline(admin.TabularInline):
	model = Lesson
	extra = 0
	fields = ('order', 'title')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
	list_display = ('title', 'creator', 'status', 'created_at')
	list_filter = ('status', 'creator')
	search_fields = ('title', 'description', 'creator__username')
	inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
	list_display = ('title', 'course', 'order')
	list_filter = ('course',)
	search_fields = ('title', 'course__title')
