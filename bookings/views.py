import secrets
from datetime import timedelta
from urllib import request

from django.utils import timezone
from django.shortcuts import render

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .models import Booking, Movie, Seat, Screening, Review
from .serializers import BookingSerializer, MovieSerializer, SeatSerializer, ScreeningSerializer, ReviewSerializer
from .utils import generate_qr_code, generate_ticket_pdf, send_ticket_email
from django.http import HttpResponse
from django.shortcuts import redirect

import stripe
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

stripe.api_key = settings.STRIPE_SECRET_KEY


# ==============================
# Movie APIs
# ==============================

# Highly optimized: Redis will cache the result of this view for 15 minutes!
@method_decorator(cache_page(60 * 15), name='dispatch')
class MovieListView(generics.ListAPIView):
    serializer_class = MovieSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # 1. Start with the full list of all movies
        queryset = Movie.objects.all()

        # 2. Extract potential query parameters from the request URL (e.g. ?search=Bat&genre=Action)
        search_query = self.request.query_params.get('search', None)
        genre_query  = self.request.query_params.get('genre', None)
        min_rating   = self.request.query_params.get('min_rating', None)

        # 3. Apply 'search' filter if provided (matches against title OR description ignoring case)
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(title__icontains=search_query) | 
                Q(description__icontains=search_query)
            )

        # 4. Apply 'genre' filter if provided (exact match ignoring case)
        if genre_query:
            queryset = queryset.filter(genre__iexact=genre_query)

        # 5. Apply 'min_rating' filter if provided (must be >= the number)
        if min_rating:
            try:
                queryset = queryset.filter(rating__gte=float(min_rating))
            except ValueError:
                pass  # Ignore invalid string values passed to min_rating

        # return the efficiently built SQL query!
        return queryset


class MovieDetailView(generics.RetrieveAPIView):
    queryset = Movie.objects.all()
    serializer_class = MovieSerializer
    permission_classes = [AllowAny]


# ==============================
# Screening APIs  ← NEW in Phase 1
# ==============================

class ScreeningListView(generics.ListAPIView):
    """
    GET /api/movies/<movie_id>/screenings/
    Returns all active screenings for a given movie.
    """
    serializer_class = ScreeningSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        movie_id = self.kwargs['movie_id']
        return Screening.objects.filter(
            movie_id=movie_id,
            is_active=True
        ).order_by('date', 'start_time')


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
        print("OTP GENERATED:", otp)   # model is modified for otp show in terminal

        seat_numbers = self.request.data.get("seat_numbers", "")

        name = self.request.user.first_name or self.request.user.username
        email = self.request.user.email

        serializer.save(
            user=self.request.user,
            name=name,
            email=email,
            otp=otp,
            otp_created_at=timezone.now(),
            seat_numbers=seat_numbers
        )


# ==============================
# Create Stripe Checkout Session  ← Updated: uses screening price
# ==============================

class CreateStripeCheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        movie_id     = request.data.get("movie")
        screening_id = request.data.get("screening")   # NEW: prefer screening
        name         = request.data.get("name")
        email        = request.data.get("email")
        seat_numbers = request.data.get("seat_numbers", "")
        seats_count  = request.data.get("seats", 1)

        # ------ Resolve Movie + Screening ------
        screening = None
        movie = None

        if screening_id:
            try:
                screening = Screening.objects.select_related('movie').get(id=screening_id)
                movie = screening.movie
            except Screening.DoesNotExist:
                return Response({"error": "Screening not found"}, status=status.HTTP_404_NOT_FOUND)
        elif movie_id:
            try:
                movie = Movie.objects.get(id=movie_id)
            except Movie.DoesNotExist:
                return Response({"error": "Movie not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"error": "Provide movie or screening id"}, status=status.HTTP_400_BAD_REQUEST)

        # ------ Determine price ------
        # If screening exists use its price, else default to ₹250
        unit_price_paise = int((screening.price_per_seat if screening else 250) * 100)

        # ------ Create PENDING booking ------
        booking = Booking.objects.create(
            user=request.user,
            movie=movie,
            screening=screening,
            name=name,
            email=email,
            seat_numbers=seat_numbers,
            seats=seats_count,
            status="PENDING"
        )

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8000').rstrip('/')

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'inr',
                        'product_data': {
                            'name': f"{movie.title} Ticket(s)",
                            'description': f"Seats: {seat_numbers}" + (
                                f" | {screening.date} {screening.start_time} | {screening.hall}"
                                if screening else ""
                            ),
                        },
                        'unit_amount': unit_price_paise,
                    },
                    'quantity': seats_count,
                }],
                mode='payment',
                success_url=f"{frontend_url}/api/bookings/payment-success/?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{frontend_url}/movie/{movie.id}/",
                client_reference_id=str(booking.booking_id),
                customer_email=email,
            )
            return Response({'checkout_url': checkout_session.url})
        except Exception as e:
            booking.delete()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==============================
# Stripe Payment Webhook / Success
# ==============================

class StripePaymentSuccessView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return HttpResponse("Missing session_id", status=400)

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except Exception as e:
            return HttpResponse(f"Error retrieving Stripe session: {e}", status=400)

        if session.payment_status == 'paid':
            booking_id = session.client_reference_id
            try:
                booking = Booking.objects.get(booking_id=booking_id)
                if booking.status != "CONFIRMED":
                    booking.status = "CONFIRMED"
                    booking.save()

                    if booking.seat_numbers:
                        seat_list = [s.strip() for s in booking.seat_numbers.split(',') if s.strip()]

                        # Mark seats booked per screening (new), or per movie (old)
                        if booking.screening:
                            Seat.objects.filter(
                                screening=booking.screening,
                                seat_number__in=seat_list
                            ).update(is_booked=True)
                        elif booking.movie:
                            Seat.objects.filter(
                                movie=booking.movie,
                                seat_number__in=seat_list
                            ).update(is_booked=True)

                    # Generate QR, PDF, and Email
                    try:
                        generate_qr_code(booking)
                        pdf_content = generate_ticket_pdf(booking)
                        try:
                            send_ticket_email(booking, pdf_content)
                        except Exception as email_err:
                            print(f"Email failed to send: {email_err}")
                    except Exception as e:
                        print(f"Ticket generation failed: {e}")
            except Booking.DoesNotExist:
                return HttpResponse("Booking not found.", status=400)

            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8000').rstrip('/')
            return redirect(f"{frontend_url}/my-bookings/?payment=success")
        else:
            return HttpResponse("Payment was not successful.", status=400)


# ==============================
# Cancel Booking
# ==============================

class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):

        # 1. Fetch the booking that belongs exclusively to the user
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

        # 2. Prevent cancelling already cancelled bookings
        if booking.status == "CANCELLED":
            return Response({"error": "Booking is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Time Validation logic: If this booking is tied to a Screening, check the time
        if booking.screening:
            # Combine the Screening Date and Time into a single timezone-aware Datetime object
            from datetime import datetime, timedelta
            show_datetime = timezone.make_aware(
                datetime.combine(booking.screening.date, booking.screening.start_time)
            )
            
            # If the current time + 2 hours is AFTER the show time, it's too late!
            if timezone.now() + timedelta(hours=2) > show_datetime:
                return Response(
                    {"error": "Too late to cancel! Tickets must be cancelled at least 2 hours before the show."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 4. If we passed all checks, update the Database Document
        booking.status = "CANCELLED"
        booking.save()

        # 5. Free up the seats so others can buy them!
        if booking.seat_numbers:
            seat_list = [s.strip() for s in booking.seat_numbers.split(',') if s.strip()]
            if booking.screening:
                Seat.objects.filter(screening=booking.screening, seat_number__in=seat_list).update(is_booked=False)
            elif booking.movie:
                Seat.objects.filter(movie=booking.movie, seat_number__in=seat_list).update(is_booked=False)

        return Response({
            "message": "Booking cancelled successfully. Your seats have been released."
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


# ============================== Frontend Views ==============================

def home(request):
    return render(request, "index.html")

def movie_detail_page(request, movie_id):
    return render(request, "movie.html", {"movie_id": movie_id})

def verify_ticket_view(request, booking_id):
    try:
        booking = Booking.objects.get(booking_id=booking_id)
        return render(request, "verify_ticket.html", {"booking": booking})
    except Booking.DoesNotExist:
        return HttpResponse("Invalid Ticket", status=404)


# ============================== Seat List (per Screening) ==============================

class SeatListView(generics.ListAPIView):
    """
    GET /api/screenings/<screening_id>/seats/
    Returns seats for a screening. Auto-creates 10x10 grid if none exist.
    """
    serializer_class = SeatSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        screening_id = self.kwargs.get('screening_id')
        movie_id     = self.kwargs.get('movie_id')

        if screening_id:
            # New flow: seats per screening
            seats = Seat.objects.filter(screening_id=screening_id)
            if not seats.exists():
                try:
                    screening = Screening.objects.get(id=screening_id)
                    rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
                    new_seats = [
                        Seat(screening=screening, seat_number=f"{row}{num}")
                        for row in rows
                        for num in range(1, 11)
                    ]
                    Seat.objects.bulk_create(new_seats)
                    seats = Seat.objects.filter(screening_id=screening_id)
                except Screening.DoesNotExist:
                    pass
            return seats

        elif movie_id:
            # Old flow: seats per movie (backward compat)
            seats = Seat.objects.filter(movie_id=movie_id, screening__isnull=True)
            if not seats.exists():
                rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
                try:
                    movie = Movie.objects.get(id=movie_id)
                    new_seats = [
                        Seat(movie=movie, seat_number=f"{row}{num}")
                        for row in rows
                        for num in range(1, 11)
                    ]
                    Seat.objects.bulk_create(new_seats)
                    seats = Seat.objects.filter(movie_id=movie_id, screening__isnull=True)
                except Movie.DoesNotExist:
                    pass
            return seats

        return Seat.objects.none()


# ==============================
# Review APIs (PHASE 2)
# ==============================
class ReviewListCreateView(generics.ListCreateAPIView):
    """
    GET /api/movies/<movie_id>/reviews/
    POST /api/movies/<movie_id>/reviews/
    Fetches all reviews for a specific movie, or creates a new one.
    """
    serializer_class = ReviewSerializer
    
    # We override get_permissions because GET requests should be public, but POST requests require Login
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        movie_id = self.kwargs.get('movie_id')
        # Only return reviews bound to the specific Movie ID we passed in the URL
        return Review.objects.filter(movie_id=movie_id).order_by('-created_at')

    def perform_create(self, serializer):
        # 1. Fetch the Movie ID from URL kwargs
        movie_id = self.kwargs.get('movie_id')
        
        # 2. Prevent server crash if movie does not exist (let database constraints handle or catch properly)
        try:
            movie = Movie.objects.get(id=movie_id)
        except Movie.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Movie not found.")
            
        # 3. Prevent duplicate reviews (a user can only post once per movie)
        if Review.objects.filter(movie=movie, user=self.request.user).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("You have already reviewed this movie.")
            
        # 4. Save! We explicitly connect the 'user' and 'movie' objects server-side.
        serializer.save(user=self.request.user, movie=movie)
