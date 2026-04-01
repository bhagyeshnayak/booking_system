import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
django.setup()

from bookings.models import Movie

def apply_real_posters():
    poster_map = {
        "Interstellar": "https://upload.wikimedia.org/wikipedia/en/b/bc/Interstellar_film_poster.jpg",
        "Dune: Part Two": "https://upload.wikimedia.org/wikipedia/en/8/8e/Dune_Part_Two_poster.jpg",
        "Jurassic Park": "https://upload.wikimedia.org/wikipedia/en/e/e7/Jurassic_Park_poster.jpg",
        "Deadpool": "https://upload.wikimedia.org/wikipedia/en/4/46/Video_Game_Cover_-_Deadpool.jpg",
        "Amélie": "https://upload.wikimedia.org/wikipedia/en/5/53/Amelie_poster.jpg",
        "Coco": "https://upload.wikimedia.org/wikipedia/en/9/98/Coco_%282017_film%29_poster.jpg",
        "Pulp Fiction": "https://upload.wikimedia.org/wikipedia/en/3/3b/Pulp_Fiction_%281994%29_poster.jpg",
        "Se7en": "https://upload.wikimedia.org/wikipedia/en/6/68/Seven_%28movie%29_poster.jpg",
        "City of God": "https://upload.wikimedia.org/wikipedia/en/1/10/CidadedeDeus.jpg",
        "Spirited Away": "https://upload.wikimedia.org/wikipedia/en/d/db/Spirited_Away_Japanese_poster.png",
        "Saving Private Ryan": "https://upload.wikimedia.org/wikipedia/en/a/ac/Saving_Private_Ryan_poster.jpg",
        "The Green Mile": "https://upload.wikimedia.org/wikipedia/en/c/ce/Green_mile.jpg",
        "Leon: The Professional": "https://upload.wikimedia.org/wikipedia/en/0/03/Leon-poster.jpg",
        "Terminator 2: Judgment Day": "https://upload.wikimedia.org/wikipedia/en/8/85/Terminator2poster.jpg",
        "Back to the Future": "https://upload.wikimedia.org/wikipedia/en/d/d2/Back_to_the_Future.jpg",
        "Psycho": "https://upload.wikimedia.org/wikipedia/en/b/b9/Psycho_%281960%29.jpg",
        "The Pianist": "https://upload.wikimedia.org/wikipedia/en/a/a6/The_Pianist_movie.jpg",
        "The Lion King": "https://upload.wikimedia.org/wikipedia/en/3/3d/The_Lion_King_poster.jpg",
        "Glengarry Glen Ross": "https://upload.wikimedia.org/wikipedia/en/c/c5/Glengarry_glen_ross_poster.jpg",
        "Apocalypse Now": "https://upload.wikimedia.org/wikipedia/en/c/c2/Apocalypse_Now_poster.jpg",
        "Memento": "https://upload.wikimedia.org/wikipedia/en/c/c7/Memento_poster.jpg",
        "The Departed": "https://upload.wikimedia.org/wikipedia/en/5/50/Departed234.jpg",
        "The Prestige": "https://upload.wikimedia.org/wikipedia/en/d/d2/Prestige_poster.jpg",
        "Grave of the Fireflies": "https://upload.wikimedia.org/wikipedia/en/a/a5/Grave_of_the_Fireflies_Japanese_poster.jpg",
        "Django Unchained": "https://upload.wikimedia.org/wikipedia/en/8/8b/Django_Unchained_Poster.jpg",
        "The Shining": "https://upload.wikimedia.org/wikipedia/en/1/1d/The_Shining_%281980%29_U.K._release_poster_-_The_tide_of_terror_that_swept_America_IS_HERE.jpg",
        "WALL·E": "https://upload.wikimedia.org/wikipedia/en/c/c2/WALL-Eposter.jpg",
        "American Beauty": "https://upload.wikimedia.org/wikipedia/en/b/b6/American_Beauty_poster.jpg"
    }

    updated = 0
    for title, url in poster_map.items():
        try:
            movie = Movie.objects.get(title=title)
            movie.poster = url
            movie.save()
            updated += 1
            print(f"Updated poster for {title}")
        except Movie.DoesNotExist:
            print(f"Movie {title} not found in DB.")
            
    print(f"Successfully applied {updated} real movie posters!")

if __name__ == "__main__":
    apply_real_posters()
