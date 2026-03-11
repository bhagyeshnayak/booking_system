import secrets
from datetime import timedelta
from urllib import request

from django.utils import timezone
from django.shortcuts import render

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .models import Booking, Movie, Seat
from .serializers import BookingSerializer, MovieSerializer, SeatSerializer


# ==============================
# Movie APIs
# ==============================

class MovieListView(generics.ListAPIView):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    permission_classes = [AllowAny]


class MovieDetailView(generics.RetrieveAPIView):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    permission_classes = [AllowAny]


# ==============================
# Create & List Bookings
# ==============================

class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        otp = str(secrets.randbelow(900000) + 100000)
        print("OTP GENERATED:", otp)   # model is mofified for otp show in terminal

        serializer.save(
            user=self.request.user,
            otp=otp,
            otp_created_at=timezone.now()
        )


# ==============================
# Verify OTP
# ==============================

class VerifyBookingOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):

        try:
            booking = Booking.objects.get(
                booking_id=booking_id,
                user=request.user
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if booking.otp_created_at:
            if timezone.now() > booking.otp_created_at + timedelta(minutes=5):
                return Response(
                    {"error": "OTP expired"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        otp = request.data.get("otp")

        if booking.otp == otp:
            booking.status = "CONFIRMED"
            booking.save()

            return Response({
                "message": "Booking confirmed"
            })

        return Response(
            {"error": "Invalid OTP"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==============================
# Cancel Booking
# ==============================

class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):

        try:
            booking = Booking.objects.get(
                booking_id=booking_id,
                user=request.user
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        booking.status = "CANCELLED"
        booking.save()

        return Response({
            "message": "Booking cancelled"
        })


# ==============================
# Booking Detail
# ==============================

class BookingDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):

        try:
            booking = Booking.objects.get(
                booking_id=booking_id,
                user=request.user
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = BookingSerializer(booking)
        return Response(serializer.data)


# ==============================
# Frontend Home Page
# ==============================

def home(request):
    return render(request, "index.html")

# ============================== movie detail page ==============================
def movie_detail_page(request, movie_id):
    return render(request, "movie.html", {"movie_id": movie_id})

# ============================== seat list page ==============================
class SeatListView(generics.ListAPIView):
    serializer_class = SeatSerializer

    def get_queryset(self):
        movie_id = self.kwargs['movie_id']
        return Seat.objects.filter(movie_id=movie_id)

