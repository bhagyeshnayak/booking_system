import os
import django
import urllib.request
import urllib.parse
import json
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
django.setup()

from bookings.models import Movie

def get_itunes_poster(title):
    url = f"https://itunes.apple.com/search?media=movie&term={urllib.parse.quote(title)}&limit=1"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read())
            if data['resultCount'] > 0:
                artwork_url = data['results'][0].get('artworkUrl100', '')
                if artwork_url:
                    # Upgrade the resolution
                    return artwork_url.replace("100x100bb", "600x900bb")
    except Exception as e:
        print(f"Error fetching '{title}': {e}")
    return None

def update_posters():
    movies = Movie.objects.all()
    placeholder_url = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500&auto=format&fit=crop"
    
    updated_count = 0
    for movie in movies:
        # Check if it has the placeholder OR if the existing URL is broken
        needs_update = False
        if not movie.poster or movie.poster == placeholder_url:
            needs_update = True
        else:
            try:
                req = urllib.request.Request(movie.poster, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    pass
            except Exception:
                needs_update = True
                
        if needs_update:
            print(f"Fetching poster for '{movie.title}'...")
            new_poster = get_itunes_poster(movie.title)
            if new_poster:
                movie.poster = new_poster
                movie.save()
                print(f"  -> Found: {new_poster}")
                updated_count += 1
            else:
                print(f"  -> Could not find poster for '{movie.title}'")
            time.sleep(1) # Be nice to the API
            
    print(f"\nFinished! Updated {updated_count} movie posters with their real images.")

if __name__ == "__main__":
    update_posters()
