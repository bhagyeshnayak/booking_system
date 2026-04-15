"""
tmdb/views.py
─────────────
DRF API views that proxy TMDB API requests server-side.

All endpoints are public (AllowAny) because they only return
publicly available TMDB data — no user data is involved.

Endpoints:
  GET /api/tmdb/popular/              → popular movies (paginated)
  GET /api/tmdb/search/?q=batman      → search movies
  GET /api/tmdb/detail/<tmdb_id>/     → single movie detail
  GET /api/tmdb/videos/<tmdb_id>/     → YouTube trailer key
  POST /api/tmdb/ensure-movie/        → get-or-create local Movie from TMDB data
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status

from .services import TMDBService, TMDBError


def _tmdb_service():
    """Helper to instantiate TMDBService and handle missing API key."""
    return TMDBService()


# ── 1. Popular Movies ─────────────────────────────────────────────────────────

class TMDBPopularMoviesView(APIView):
    """
    GET /api/tmdb/popular/?page=1
    Returns a page of popular movies from TMDB.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        try:
            svc  = _tmdb_service()
            data = svc.get_popular_movies(page=page)
            return Response(data)
        except TMDBError as e:
            return Response(
                {"error": str(e), "results": [], "total_pages": 0},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {"error": "Unexpected error fetching popular movies.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ── 2. Search Movies ──────────────────────────────────────────────────────────

class TMDBSearchView(APIView):
    """
    GET /api/tmdb/search/?q=batman&page=1
    Searches TMDB for movies matching the query.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        page  = int(request.query_params.get('page', 1))

        if not query:
            return Response(
                {"error": "Query parameter 'q' is required.", "results": []},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            svc  = _tmdb_service()
            data = svc.search_movies(query=query, page=page)
            return Response(data)
        except TMDBError as e:
            return Response(
                {"error": str(e), "results": [], "total_pages": 0},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {"error": "Unexpected error during movie search.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ── 3. Movie Detail ───────────────────────────────────────────────────────────

class TMDBMovieDetailView(APIView):
    """
    GET /api/tmdb/detail/<tmdb_id>/
    Returns full movie details from TMDB.
    """
    permission_classes = [AllowAny]

    def get(self, request, tmdb_id):
        try:
            svc  = _tmdb_service()
            data = svc.get_movie_detail(tmdb_id=tmdb_id)
            return Response(data)
        except TMDBError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {"error": "Unexpected error fetching movie detail.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ── 4. Movie Videos (Trailers) ────────────────────────────────────────────────

class TMDBMovieVideosView(APIView):
    """
    GET /api/tmdb/videos/<tmdb_id>/
    Returns the best YouTube trailer key for a TMDB movie.
    """
    permission_classes = [AllowAny]

    def get(self, request, tmdb_id):
        try:
            svc  = _tmdb_service()
            data = svc.get_movie_videos(tmdb_id=tmdb_id)
            return Response(data)
        except TMDBError as e:
            return Response(
                {"error": str(e), "trailer_key": ""},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {"error": "Unexpected error fetching videos.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ── 5. Booking Bridge ─────────────────────────────────────────────────────────

class TMDBEnsureMovieView(APIView):
    """
    POST /api/tmdb/ensure-movie/
    Body: { tmdb_id, title, poster, overview, rating, genre, release_date, runtime }

    Gets or creates a local Movie record backed by TMDB data.
    Returns { movie_id: <local_db_id> } so the frontend can hand off
    to the existing Stripe booking flow unchanged.

    Requires authentication — only logged-in users can initiate bookings.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from bookings.models import Movie
        from datetime import date

        tmdb_id      = request.data.get('tmdb_id')
        title        = request.data.get('title', 'Unknown')
        poster       = request.data.get('poster', '')
        overview     = request.data.get('overview', '')
        rating       = request.data.get('rating', 0.0)
        genre        = request.data.get('genre', '')
        release_date = request.data.get('release_date', '')
        runtime      = request.data.get('runtime', 120)

        if not tmdb_id:
            return Response(
                {"error": "tmdb_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Safely parse rating to 1-decimal Decimal
        try:
            rating = round(float(rating), 1)
        except (TypeError, ValueError):
            rating = 0.0

        # Safely parse release_date
        parsed_date = None
        if release_date:
            try:
                from datetime import datetime
                parsed_date = datetime.strptime(release_date, "%Y-%m-%d").date()
            except ValueError:
                parsed_date = None

        # get_or_create by tmdb_id — idempotent, safe for concurrent requests
        movie, created = Movie.objects.get_or_create(
            tmdb_id=tmdb_id,
            defaults={
                "title":        title,
                "poster":       poster,
                "description":  overview,
                "rating":       rating,
                "genre":        genre,
                "release_date": parsed_date,
                "duration":     int(runtime) if runtime else 120,
            }
        )

        # If movie already exists, keep data fresh by updating from TMDB
        if not created:
            movie.title        = title
            movie.poster       = poster
            movie.description  = overview
            movie.rating       = rating
            movie.genre        = genre
            if parsed_date:
                movie.release_date = parsed_date
            movie.duration     = int(runtime) if runtime else movie.duration
            movie.save()

        return Response({"movie_id": movie.id, "created": created})
