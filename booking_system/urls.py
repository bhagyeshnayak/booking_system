from django.contrib import admin
from django.shortcuts import render
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from bookings.views import home, movie_detail_page

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [

    path('admin/', admin.site.urls),

    # Frontend pages
    path('', home, name="home"),
    path('movie/<int:movie_id>/', movie_detail_page, name="movie_detail"),

    # Booking APIs
    path('api/', include('bookings.urls')),

    # User authentication
    path('api/auth/', include('users.urls')),

    # JWT Token endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("my-bookings/", lambda r: render(r,"bookings.html")),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)