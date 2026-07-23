import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
django.setup()

from django.core.mail import send_mail

try:
    print("Testing Django SMTP configuration...")
    send_mail(
        'Django SMTP Test',
        'If you receive this, your SMTP settings in Django are working!',
        'nayakbhagyesh220@gmail.com',  # From
        ['nayakbhagyesh220@gmail.com'],  # To
        fail_silently=False,
    )
    print("SUCCESS: Email sent successfully!")
except Exception as e:
    print(f"FAILED: {str(e)}")
