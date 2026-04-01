from django.apps import AppConfig

class BookingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bookings'

    def ready(self):
        # We tell Django: "When you start up 'bookings' app, PLEASE check the signals file!" 
        # Without this line, the ratings logic will never actually run because signals won't trigger.
        import bookings.signals
