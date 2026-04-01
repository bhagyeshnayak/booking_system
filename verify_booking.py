import os
import django
from django.conf import settings
from io import BytesIO

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
django.setup()

from bookings.models import Booking, Movie
from bookings.utils import generate_qr_code, generate_ticket_pdf
from django.contrib.auth import get_user_model

User = get_user_model()

def run_test():
    print("Creating test user and movie...")
    user, _ = User.objects.get_or_create(username="testuser", email="test@example.com")
    movie, _ = Movie.objects.get_or_create(title="The Matrix", duration=120)
    
    print("Creating test booking...")
    booking = Booking.objects.create(
        user=user,
        name="John Doe",
        email="test@example.com",
        movie=movie,
        seat_numbers="A1,A2",
        status="CONFIRMED"
    )
    
    print("Generating QR Code...")
    try:
        generate_qr_code(booking)
        print("QR Code generated:", booking.qr_code.name)
    except Exception as e:
        print("QR ERROR:", e)
        return
        
    print("Generating PDF...")
    try:
        pdf_content = generate_ticket_pdf(booking)
        print("PDF generated successfully, size:", len(pdf_content))
    except Exception as e:
        print("PDF ERROR:", e)
        return
        
    print("SUCCESS")
    
if __name__ == "__main__":
    run_test()
