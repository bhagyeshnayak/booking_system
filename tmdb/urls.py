"""
tmdb/urls.py
────────────
URL patterns for TMDB proxy API endpoints.

All mounted under /api/tmdb/ by booking_system/urls.py
"""

from django.urls import path
from .views import (
    TMDBPopularMoviesView,
    TMDBSearchView,
    TMDBMovieDetailView,
    TMDBMovieVideosView,
    TMDBEnsureMovieView,
)

urlpatterns = [
    # GET /api/tmdb/popular/?page=1
    path('popular/',                 TMDBPopularMoviesView.as_view(),  name='tmdb-popular'),

    # GET /api/tmdb/search/?q=batman&page=1
    path('search/',                  TMDBSearchView.as_view(),         name='tmdb-search'),

    # GET /api/tmdb/detail/<tmdb_id>/
    path('detail/<int:tmdb_id>/',    TMDBMovieDetailView.as_view(),    name='tmdb-detail'),

    # GET /api/tmdb/videos/<tmdb_id>/
    path('videos/<int:tmdb_id>/',    TMDBMovieVideosView.as_view(),    name='tmdb-videos'),

    # POST /api/tmdb/ensure-movie/  (booking bridge — requires auth)
    path('ensure-movie/',            TMDBEnsureMovieView.as_view(),    name='tmdb-ensure-movie'),
]
