"""
tmdb/services.py
────────────────
Server-side TMDB API wrapper.

All TMDB calls happen HERE (server-side) so the API key is NEVER exposed
to the browser. The views proxy the responses as clean JSON.

Features:
  - 5-minute in-memory cache per endpoint to avoid hammering TMDB
  - Graceful error handling (timeout, connection error, non-200)
  - Genre ID → human-readable name mapping
  - Helpers for: popular movies, search, movie detail, videos (trailers)
"""

import requests
from django.core.cache import cache
from django.conf import settings


# ── Custom Exception ──────────────────────────────────────────────────────────

class TMDBError(Exception):
    """Raised when TMDB returns an error or is unreachable."""
    pass


# ── Genre ID → Name map (TMDB fixed list, no extra API call needed) ───────────

GENRE_MAP = {
    28:    "Action",
    12:    "Adventure",
    16:    "Animation",
    35:    "Comedy",
    80:    "Crime",
    99:    "Documentary",
    18:    "Drama",
    10751: "Family",
    14:    "Fantasy",
    36:    "History",
    27:    "Horror",
    10402: "Music",
    9648:  "Mystery",
    10749: "Romance",
    878:   "Sci-Fi",
    10770: "TV Movie",
    53:    "Thriller",
    10752: "War",
    37:    "Western",
}


# ── Service Class ─────────────────────────────────────────────────────────────

class TMDBService:
    """
    A clean wrapper around the TMDB v3 REST API.

    Usage:
        svc = TMDBService()
        movies = svc.get_popular_movies(page=1)
        results = svc.search_movies("inception")
        videos  = svc.get_movie_videos(27205)
        detail  = svc.get_movie_detail(27205)
    """

    BASE_URL   = "https://api.themoviedb.org/3"
    IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
    BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280"
    CACHE_TTL  = 5 * 60  # 5 minutes

    def __init__(self):
        api_key   = getattr(settings, 'TMDB_API_KEY', '')
        read_token = getattr(settings, 'TMDB_READ_TOKEN', '')

        if not api_key:
            raise TMDBError("TMDB_API_KEY is not set in environment variables.")

        self._params  = {"api_key": api_key, "language": "en-US"}
        self._headers = {
            "accept": "application/json",
            **({"Authorization": f"Bearer {read_token}"} if read_token else {}),
        }

    # ── Internal request helper ───────────────────────────────────────────────

    def _get(self, path: str, extra_params: dict = None) -> dict:
        """
        Make a GET request to TMDB with caching.
        Raises TMDBError on network failures or non-200 responses.
        """
        params = {**self._params, **(extra_params or {})}
        cache_key = f"tmdb:{path}:{sorted(params.items())}"

        # Return from cache if fresh
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        url = f"{self.BASE_URL}{path}"
        try:
            response = requests.get(url, params=params, headers=self._headers, timeout=8)
        except requests.Timeout:
            raise TMDBError("TMDB API request timed out. Please try again.")
        except requests.ConnectionError:
            raise TMDBError("Could not connect to TMDB. Check your internet connection.")

        if response.status_code != 200:
            raise TMDBError(f"TMDB returned status {response.status_code}: {response.text[:200]}")

        data = response.json()
        cache.set(cache_key, data, self.CACHE_TTL)
        return data

    # ── Normalisation helpers ────────────────────────────────────────────────

    def _normalize_movie(self, raw: dict) -> dict:
        """Convert a raw TMDB movie dict into a clean, frontend-ready dict."""
        genre_ids = raw.get("genre_ids") or []
        genres = [GENRE_MAP.get(gid, "") for gid in genre_ids if gid in GENRE_MAP]

        poster_path   = raw.get("poster_path")
        backdrop_path = raw.get("backdrop_path")

        return {
            "tmdb_id":      raw.get("id"),
            "title":        raw.get("title", "Unknown"),
            "overview":     raw.get("overview", ""),
            "rating":       round(raw.get("vote_average", 0), 1),
            "vote_count":   raw.get("vote_count", 0),
            "release_date": raw.get("release_date", ""),
            "genre":        ", ".join(genres) if genres else "Movie",
            "genre_ids":    genre_ids,
            "poster":       f"{self.IMAGE_BASE}{poster_path}" if poster_path else "",
            "backdrop":     f"{self.BACKDROP_BASE}{backdrop_path}" if backdrop_path else "",
            "popularity":   raw.get("popularity", 0),
            "adult":        raw.get("adult", False),
        }

    # ── Public API methods ────────────────────────────────────────────────────

    def get_popular_movies(self, page: int = 1) -> dict:
        """
        Fetch a page of popular movies.
        Returns: { results: [...], page: N, total_pages: N, total_results: N }
        """
        data = self._get("/movie/popular", {"page": page})
        return {
            "results":       [self._normalize_movie(m) for m in data.get("results", [])],
            "page":          data.get("page", 1),
            "total_pages":   data.get("total_pages", 1),
            "total_results": data.get("total_results", 0),
        }

    def search_movies(self, query: str, page: int = 1) -> dict:
        """
        Search movies by title.
        Returns same shape as get_popular_movies.
        """
        if not query or not query.strip():
            return {"results": [], "page": 1, "total_pages": 0, "total_results": 0}

        data = self._get("/search/movie", {"query": query.strip(), "page": page})
        return {
            "results":       [self._normalize_movie(m) for m in data.get("results", [])],
            "page":          data.get("page", 1),
            "total_pages":   data.get("total_pages", 1),
            "total_results": data.get("total_results", 0),
        }

    def get_movie_detail(self, tmdb_id: int) -> dict:
        """
        Fetch full detail of a movie including genres and runtime.
        Returns a single normalized movie dict with extra fields.
        """
        data = self._get(f"/movie/{tmdb_id}")

        # Genre names come as objects [{id, name}] in detail endpoint
        genres = [g.get("name", "") for g in data.get("genres", [])]
        poster_path   = data.get("poster_path")
        backdrop_path = data.get("backdrop_path")

        return {
            "tmdb_id":        data.get("id"),
            "title":          data.get("title", "Unknown"),
            "tagline":        data.get("tagline", ""),
            "overview":       data.get("overview", ""),
            "rating":         round(data.get("vote_average", 0), 1),
            "vote_count":     data.get("vote_count", 0),
            "release_date":   data.get("release_date", ""),
            "runtime":        data.get("runtime") or 120,
            "genre":          ", ".join(genres) if genres else "Movie",
            "genres":         genres,
            "poster":         f"{self.IMAGE_BASE}{poster_path}" if poster_path else "",
            "backdrop":       f"{self.BACKDROP_BASE}{backdrop_path}" if backdrop_path else "",
            "popularity":     data.get("popularity", 0),
            "homepage":       data.get("homepage", ""),
            "imdb_id":        data.get("imdb_id", ""),
            "status":         data.get("status", ""),
            "budget":         data.get("budget", 0),
            "revenue":        data.get("revenue", 0),
        }

    def get_movie_videos(self, tmdb_id: int) -> dict:
        """
        Fetch video list for a movie. Filters for YouTube trailers.
        Returns: { trailer_key: "yt_key_or_empty", all_videos: [...] }
        """
        data = self._get(f"/movie/{tmdb_id}/videos")
        videos = data.get("results", [])

        # Prefer official trailers on YouTube. Do not fall back to teasers or clips as requested.
        youtube_trailers = [v for v in videos if v.get("site") == "YouTube" and v.get("type") == "Trailer"]

        # Pick the best video: official trailer > any trailer
        official = [v for v in youtube_trailers if v.get("official")]
        best = (official or youtube_trailers or [None])[0]

        return {
            "trailer_key":  best.get("key", "") if best else "",
            "trailer_name": best.get("name", "") if best else "",
            "all_videos": [
                {
                    "key":      v.get("key"),
                    "name":     v.get("name"),
                    "type":     v.get("type"),
                    "official": v.get("official", False),
                    "site":     v.get("site"),
                }
                # fixed: using youtube_trailers instead of deleted youtube_videos
                for v in youtube_trailers[:10]
            ],
        }
