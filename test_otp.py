import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "booking_system.settings")
django.setup()

from django.contrib.auth import get_user_model
from bookings.models import Movie, Booking
from bookings.utils import generate_qr_code, generate_ticket_pdf, send_ticket_email

User = get_user_model()
user = User.objects.first()
movie = Movie.objects.first()

b = Booking.objects.create(
    user=user,
    movie=movie,
    name="Test User",
    email="test@example.com",
    seats=2,
    seat_numbers="A1, A2",
    status="PENDING",
    otp="123456"
)

try:
    print("Generating QR...")
    generate_qr_code(b)
    print("Generating PDF...")
    pdf = generate_ticket_pdf(b)
    print("Sending Email...")
    send_ticket_email(b, pdf)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    b.delete()
