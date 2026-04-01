from django.shortcuts import render
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from users.views import UserBookingsView
from .views import (
    MovieListView,
    MovieDetailView,
    ScreeningListView,
    BookingListCreateView,
    BookingDetailView,
    SeatListView,
    CreateStripeCheckoutSessionView,
    StripePaymentSuccessView,
    CancelBookingView,
    movie_detail_page,
    DownloadTicketPDFView,
    ReviewListCreateView
)

urlpatterns = [

    # ── Movies ──────────────────────────────────────────────────
    path('movies/', MovieListView.as_view(), name="movies"),
    path('movies/<int:pk>/', MovieDetailView.as_view(), name="movie-detail"),
    
    # ── Reviews (NEW PHASE 2) ───────────────────────────────────
    path('movies/<int:movie_id>/reviews/', ReviewListCreateView.as_view(), name="movie-reviews"),

    # ── Screenings (NEW) ────────────────────────────────────────
    # List all screenings for a movie
    path('movies/<int:movie_id>/screenings/', ScreeningListView.as_view(), name="screening-list"),

    # ── Seats ───────────────────────────────────────────────────
    # Old: seats per movie (backward compat)
    path('movies/<int:movie_id>/seats/', SeatListView.as_view(), name="seat-list-movie"),
    # New: seats per screening
    path('screenings/<int:screening_id>/seats/', SeatListView.as_view(), name="seat-list-screening"),

    # ── Bookings ────────────────────────────────────────────────
    path('bookings/', BookingListCreateView.as_view(), name="bookings"),
    path('bookings/<uuid:booking_id>/', BookingDetailView.as_view(), name="booking-detail"),
    path('bookings/create-checkout-session/', CreateStripeCheckoutSessionView.as_view(), name="create-checkout-session"),
    path('bookings/payment-success/', StripePaymentSuccessView.as_view(), name="payment-success"),
    path('bookings/<uuid:booking_id>/cancel/', CancelBookingView.as_view(), name="cancel-booking"),
    path('bookings/<uuid:booking_id>/pdf/', DownloadTicketPDFView.as_view(), name="download-ticket-pdf"),

    # ── User bookings ────────────────────────────────────────────
    path("my-bookings/", UserBookingsView.as_view(), name="my-bookings"),

    # ── Frontend pages ───────────────────────────────────────────
    path("movie/<int:movie_id>/", movie_detail_page, name="movie_detail"),

]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)