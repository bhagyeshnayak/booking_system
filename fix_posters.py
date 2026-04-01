import os
import django
import urllib.request
from urllib.error import URLError, HTTPError

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
django.setup()

from bookings.models import Movie

def fix_broken_posters():
    print("Checking movie posters for broken links...")
    movies = Movie.objects.all()
    broken_count = 0
    
    # A reliable placeholder movie image
    placeholder_url = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500&auto=format&fit=crop"
    
    for movie in movies:
        if not movie.poster:
            continue
            
        try:
            req = urllib.request.Request(movie.poster, method='HEAD')
            req.add_header('User-Agent', 'Mozilla/5.0')
            with urllib.request.urlopen(req, timeout=5) as response:
                pass # It works
        except HTTPError as e:
            print(f"Broken poster found for '{movie.title}': {movie.poster} (HTTP Error: {e.code})")
            movie.poster = placeholder_url
            movie.save()
            broken_count += 1
        except URLError as e:
            print(f"Error checking '{movie.title}': {e.reason}")
            movie.poster = placeholder_url
            movie.save()
            broken_count += 1
        except Exception as e:
            print(f"Error checking '{movie.title}': {e}")
            movie.poster = placeholder_url
            movie.save()
            broken_count += 1
            
    print(f"Done! Fixed {broken_count} broken movie posters.")

if __name__ == "__main__":
    fix_broken_posters()
