"""
WSGI config for booking_system project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')

application = get_wsgi_application()

# Auto-population hook for Render Free Tier (no shell access)
try:
    from bookings.models import Movie
    if Movie.objects.count() == 0:
        import populate_movies
except Exception as e:
    print(f"Auto-population skipped or failed: {e}")
