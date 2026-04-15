from django.contrib import admin
from django.shortcuts import render
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.urls import re_path
from django.views.static import serve

from bookings.views import home, movie_detail_page, verify_ticket_view, tmdb_movie_detail_page

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [

    path('admin/', admin.site.urls),

    # Frontend pages
    path('', home, name="home"),
    path('movie/<int:movie_id>/', movie_detail_page, name="movie_detail"),
    path('movie/tmdb/<int:tmdb_id>/', tmdb_movie_detail_page, name="tmdb_movie_detail"),
    path('verify-ticket/<uuid:booking_id>/', verify_ticket_view, name="verify-ticket"),

    # Booking APIs
    path('api/', include('bookings.urls')),

    # TMDB proxy API (server-side, keeps API key secret)
    path('api/tmdb/', include('tmdb.urls')),

    # User authentication
    path('api/auth/', include('users.urls')),

    # JWT Token endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("my-bookings/", lambda r: render(r,"bookings.html")),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if not settings.DEBUG:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {
            'document_root': settings.MEDIA_ROOT,
        }),
    ]