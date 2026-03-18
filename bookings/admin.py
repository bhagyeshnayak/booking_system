from django.contrib import admin
from .models import Booking
from .models import Movie
from .models import Seat
admin.site.register(Booking)
admin.site.register(Movie)
admin.site.register(Seat)
from django.db.utils import OperationalError, ProgrammingError

try:
    # Get the first movie or adjust this to specify which movie to create seats for
    movie = Movie.objects.first()
    
    if movie and not Seat.objects.filter(movie=movie).exists():
        rows = ["A","B","C","D"]
        cols = range(1,9)
        for r in rows:
            for c in cols:
                Seat.objects.create(movie=movie, seat_number=f"{r}{c}", is_booked=False)
except (OperationalError, ProgrammingError):
    pass
