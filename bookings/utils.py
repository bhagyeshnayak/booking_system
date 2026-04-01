import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.mail import EmailMessage
from django.conf import settings
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

def generate_qr_code(booking):
    if not booking.qr_code:
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8000').rstrip('/')
        verification_link = f"{frontend_url}/verify-ticket/{booking.booking_id}/"
        qr.add_data(verification_link)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        filename = f"qr_{booking.booking_id}.png"
        booking.qr_code.save(filename, ContentFile(buffer.getvalue()), save=True)

def generate_ticket_pdf(booking):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    p.setFont("Helvetica-Bold", 24)
    p.drawString(100, height - 100, "CineBook - Premium Ticket")
    
    p.setFont("Helvetica", 14)
    p.drawString(100, height - 150, f"Movie: {booking.movie.title}")
    p.drawString(100, height - 180, f"Name: {booking.name}")
    p.drawString(100, height - 210, f"Booking ID: {booking.booking_id}")
    p.drawString(100, height - 240, f"Seats: {booking.seat_numbers}")
    
    if booking.qr_code and hasattr(booking.qr_code, 'path'):
        try:
            # Explicitly checking file existence to prevent reportlab from crashing on missing file
            import os
            if os.path.exists(booking.qr_code.path):
                p.drawImage(booking.qr_code.path, 100, height - 420, width=150, height=150)
            else:
                print(f"QR code file not found at {booking.qr_code.path}")
        except Exception as e:
            print("Could not draw QR code on PDF", e)
        
    p.showPage()
    p.save()
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def send_ticket_email(booking, pdf_content):
    subject = f"Your Tickets for {booking.movie.title}"
    
    text_content = f"Hello {booking.name},\n\nYour booking for {booking.movie.title} is confirmed!\nBooking ID: {booking.booking_id}\nSeats: {booking.seat_numbers} ({booking.seats} Tickets)\n\nAttached is your official ticket.\n\nEnjoy the movie,\nCineBook Team"
    
    from_email = getattr(settings, 'EMAIL_HOST_USER', 'no-reply@cinebook.com')
    
    from django.template.loader import render_to_string
    from django.core.mail import EmailMultiAlternatives
    
    try:
        html_content = render_to_string('ticket_email.html', {'booking': booking})
    except Exception as e:
        print(f"Template rendering failed: {e}")
        html_content = None

    email = EmailMultiAlternatives(subject, text_content, from_email, [booking.email])
    
    if html_content:
        email.attach_alternative(html_content, "text/html")
        
    email.attach(f'ticket_{booking.booking_id}.pdf', pdf_content, 'application/pdf')
    
    # Attach QR code inline for HTML email, and regular attach just in case
    if booking.qr_code:
        try:
            qr_data = booking.qr_code.read()
            email.attach(f'qr_{booking.booking_id}.png', qr_data, 'image/png')
            
            # Reset file pointer to read again for inline image
            if hasattr(booking.qr_code, 'seek'):
                booking.qr_code.seek(0)
                qr_data = booking.qr_code.read()
                
            from email.mime.image import MIMEImage
            qr_image = MIMEImage(qr_data)
            qr_image.add_header('Content-ID', '<qr_image>')
            email.attach(qr_image)
        except Exception as e:
            print("Failed to attach QR code", e)
            
    email.send(fail_silently=False)
