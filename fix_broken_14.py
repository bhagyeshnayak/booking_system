import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
import django
django.setup()

from bookings.models import Movie

# Verified working TMDB poster URLs for the 14 broken movies
FIXES = {
    "The Dark Knight":          "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "Dune: Part Two":           "https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg",
    "Gladiator":                "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg",
    "City of God":              "https://image.tmdb.org/t/p/w500/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg",
    "The Green Mile":           "https://image.tmdb.org/t/p/w500/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg",
    "The Pianist":              "https://image.tmdb.org/t/p/w500/2hFvxCCWrTmCYwfy7yum0GKRi3Y.jpg",
    "The Lion King":            "https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg",
    "Glengarry Glen Ross":      "https://image.tmdb.org/t/p/w500/zcaEDx8KlVfh4vKfMNLhiSi5Oz4.jpg",
    "Apocalypse Now":           "https://image.tmdb.org/t/p/w500/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg",
    "The Departed":             "https://image.tmdb.org/t/p/w500/nT97ifVT2J1yMQmeq20Qblg61T.jpg",
    "American Beauty":          "https://image.tmdb.org/t/p/w500/wby9315QzVKdW9BonAefg8jGTTb.jpg",
    "Amélie":                   "https://image.tmdb.org/t/p/w500/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg",
    "The Truman Show":          "https://image.tmdb.org/t/p/w500/vuza0WqY239yBXOadKlGwJsZJFE.jpg",
    "Jurassic Park":            "https://image.tmdb.org/t/p/w500/maFjKnJ62hDQ9E66dKqDZgbUy0H.jpg",
}

updated = 0
for movie in Movie.objects.all():
    title = movie.title.strip()
    if title in FIXES:
        movie.poster = FIXES[title]
        movie.save()
        updated += 1
        print(f"  ✅ Fixed: {title}")

print(f"\nUpdated {updated} broken posters.")
