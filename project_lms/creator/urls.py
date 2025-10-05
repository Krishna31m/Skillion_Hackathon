from django.urls import path
from .views import ApplyCreatorView, CreatorDashboardView

urlpatterns = [
    path('apply/', ApplyCreatorView.as_view(), name='creator-apply'),
    path('dashboard/', CreatorDashboardView.as_view(), name='creator-dashboard'),
]