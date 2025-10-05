from django.contrib import admin
from .models import CreatorApplication


@admin.register(CreatorApplication)
class CreatorApplicationAdmin(admin.ModelAdmin):
	list_display = ('applicant', 'status', 'applied_at', 'reviewer', 'reviewed_at')
	list_filter = ('status',)
	search_fields = ('applicant__username',)
	readonly_fields = ('applied_at',)
