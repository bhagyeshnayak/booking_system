import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
import django
django.setup()

from bookings.models import Movie

movies = Movie.objects.all().order_by('id')
with open('movie_list.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total movies: {movies.count()}\n\n")
    for m in movies:
        f.write(f"ID={m.id} | {m.title} | poster={m.poster}\n")
print("Written to movie_list.txt")
