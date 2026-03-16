from django.shortcuts import render
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from users.views import UserBookingsView
from .views import (
    MovieListView,
    MovieDetailView,
    BookingListCreateView,
    BookingDetailView,
    SeatListView,
    VerifyBookingOTPView,
    CancelBookingView,
    movie_detail_page,
    DownloadTicketPDFView,
)

urlpatterns = [

    # Movies
    path('movies/', MovieListView.as_view(), name="movies"),
    path('movies/<int:pk>/', MovieDetailView.as_view(), name="movie-detail"),

    # Bookings
    path('bookings/', BookingListCreateView.as_view(), name="bookings"),
    path('bookings/<uuid:booking_id>/', BookingDetailView.as_view(), name="booking-detail"),
    path("movie/<int:movie_id>/", movie_detail_page, name="movie_detail"),

    path('bookings/<uuid:booking_id>/verify-otp/', VerifyBookingOTPView.as_view(), name="verify-otp"),

    path('bookings/<uuid:booking_id>/cancel/', CancelBookingView.as_view(), name="cancel-booking"),
    path('bookings/<uuid:booking_id>/pdf/', DownloadTicketPDFView.as_view(), name="download-ticket-pdf"),
    path('movies/<int:movie_id>/seats/', SeatListView.as_view(), name="seat-list"),
    path("my-bookings/", UserBookingsView.as_view(), name="my-bookings"),
   
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)