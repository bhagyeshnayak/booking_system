import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
django.setup()

from bookings.models import Booking
from bookings.utils import generate_qr_code, generate_ticket_pdf, send_ticket_email

try:
    print("Fetching a recent booking...")
    # Find any booking to test with
    booking = Booking.objects.last()
    
    if booking:
        print(f"Testing with Booking ID: {booking.booking_id}")
        
        # Override the email to send to the developer
        original_email = booking.email
        booking.email = 'nayakbhagyesh220@gmail.com'
        
        # Ensure name is set
        if not booking.name:
            booking.name = "Test User"

        print("Generating QR code...")
        generate_qr_code(booking)
        
        print("Generating PDF...")
        pdf_content = generate_ticket_pdf(booking)
        
        print("Sending Ticket Email...")
        send_ticket_email(booking, pdf_content)
        print("SUCCESS: Booking success verification email sent!")
        
        # Revert email
        booking.email = original_email
    else:
        print("FAILED: No bookings found in the database. Please make a booking first.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILED: {str(e)}")
