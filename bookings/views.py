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
from .models import Booking, Movie, Seat
from .serializers import BookingSerializer, MovieSerializer, SeatSerializer
from .utils import generate_qr_code, generate_ticket_pdf, send_ticket_email
from django.http import HttpResponse


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
        
        seat_numbers = self.request.data.get("seat_numbers", "")

        serializer.save(
            user=self.request.user,
            otp=otp,
            otp_created_at=timezone.now(),
            seat_numbers=seat_numbers
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
            
            # Mark seats as booked
            if booking.seat_numbers:
                seat_list = [s.strip() for s in booking.seat_numbers.split(',') if s.strip()]
                Seat.objects.filter(movie=booking.movie, seat_number__in=seat_list).update(is_booked=True)

            # Generate QR, PDF, and Email
            generate_qr_code(booking)
            pdf_content = generate_ticket_pdf(booking)
            send_ticket_email(booking, pdf_content)

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
# Download Ticket PDF
# ==============================

class DownloadTicketPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.get(
                booking_id=booking_id,
                user=request.user,
                status="CONFIRMED"
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Confirmed booking not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        pdf_content = generate_ticket_pdf(booking)
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="ticket_{booking.booking_id}.pdf"'
        return response


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
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        movie_id = self.kwargs['movie_id']
        seats = Seat.objects.filter(movie_id=movie_id)
        
        # Auto-generate a 10x10 BookMyShow style layout if none exists
        if not seats.exists():
            rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
            new_seats = []
            movie = Movie.objects.get(id=movie_id)
            for row in rows:
                for num in range(1, 11):
                    new_seats.append(Seat(movie=movie, seat_number=f"{row}{num}"))
            Seat.objects.bulk_create(new_seats)
            seats = Seat.objects.filter(movie_id=movie_id)
            
        return seats

