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
        qr_data = f"Booking ID: {booking.booking_id}\nName: {booking.name}\nMovie: {booking.movie.title}\nSeats: {booking.seat_numbers}"
        qr.add_data(qr_data)
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
            p.drawImage(booking.qr_code.path, 100, height - 420, width=150, height=150)
        except Exception as e:
            print("Could not draw QR code on PDF", e)
        
    p.showPage()
    p.save()
    
    pdf = buffer.getvalue()
    buffer.close()
    return pdf

def send_ticket_email(booking, pdf_content):
    subject = f"Your Tickets for {booking.movie.title}"
    body = f"Hello {booking.name},\n\nYour booking is confirmed! Attached is your official ticket.\n\nEnjoy the movie,\nCineBook Team"
    
    from_email = getattr(settings, 'EMAIL_HOST_USER', 'no-reply@cinebook.com')
    
    email = EmailMessage(subject, body, from_email, [booking.email])
    email.attach(f'ticket_{booking.booking_id}.pdf', pdf_content, 'application/pdf')
    email.send(fail_silently=False)
