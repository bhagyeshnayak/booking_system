import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
django.setup()

from bookings.models import Booking, Movie
from bookings.utils import generate_qr_code, generate_ticket_pdf, send_ticket_email

# Find a booking or create one
booking = Booking.objects.last()
if not booking:
    movie = Movie.objects.first()
    if not movie:
        movie = Movie.objects.create(title="Test Movie", duration=120, genre="Action")
    booking = Booking.objects.create(name="Test User", email="nayakbhagyesh220@gmail.com", seats=2, seat_numbers="A1,A2", movie=movie)

# Force the email to be nayakbhagyesh220@gmail.com
booking.email = "nayakbhagyesh220@gmail.com"
booking.save()

print(f"Testing with booking {booking.booking_id} for movie {booking.movie.title}")

generate_qr_code(booking)
pdf = generate_ticket_pdf(booking)
send_ticket_email(booking, pdf)

print("Test email sent!")
