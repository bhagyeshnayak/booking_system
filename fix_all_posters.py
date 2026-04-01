import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_system.settings')
import django
django.setup()

from bookings.models import Movie

# Verified TMDB poster paths for every movie
# Format: "Movie Title" -> "https://image.tmdb.org/t/p/w500/POSTER_PATH"
TMDB_POSTERS = {
    "Inception":                        "https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
    "Interstellar":                     "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    "The Dark Knight":                  "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911BTUgMe1F608y.jpg",
    "Dune: Part Two":                   "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nez7S.jpg",
    "Avengers: Endgame":                "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    "The Matrix":                       "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    "Gladiator":                        "https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgCLYk.jpg",
    "The Godfather":                    "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    "Titanic":                          "https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg",
    "The Shawshank Redemption":         "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    "Pulp Fiction":                     "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    "Forrest Gump":                     "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    "Fight Club":                       "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    "Goodfellas":                       "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",
    "The Silence of the Lambs":         "https://image.tmdb.org/t/p/w500/uS9m8OBk1A8eM9I042bx8XXpqAq.jpg",
    "Se7en":                            "https://image.tmdb.org/t/p/w500/6yoghtyTpznpBik8EngEmJskVUO.jpg",
    "City of God":                      "https://image.tmdb.org/t/p/w500/k7eYdWvhYQyRQoU2TB2A2Xu2TIS.jpg",
    "The Lord of the Rings: The Return of the King": "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
    "Spirited Away":                    "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    "Saving Private Ryan":              "https://image.tmdb.org/t/p/w500/1wY4psJ5NVEhCuOYROwLH2XExM2.jpg",
    "The Green Mile":                   "https://image.tmdb.org/t/p/w500/o0lO84GI7qrG6XkJAMDn13W1K7M.jpg",
    "Leon: The Professional":           "https://image.tmdb.org/t/p/w500/yI6X2cCM5YPJtxMhUd3dPGqDAhw.jpg",
    "Terminator 2: Judgment Day":       "https://image.tmdb.org/t/p/w500/5M0j0B18abtBI5gi2RhfjjurTqb.jpg",
    "Back to the Future":               "https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg",
    "Psycho":                           "https://image.tmdb.org/t/p/w500/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg",
    "The Pianist":                      "https://image.tmdb.org/t/p/w500/2hFvxCCWrTmCYwfy7yum0GKRk3S.jpg",
    "Parasite":                         "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    "The Lion King":                    "https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyNhXjyxgbt.jpg",
    "Glengarry Glen Ross":              "https://image.tmdb.org/t/p/w500/eHMh7bCO68JqIiodxWnldHi3KWa.jpg",
    "Alien":                            "https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg",
    "Apocalypse Now":                   "https://image.tmdb.org/t/p/w500/gQB8Y5RCMkGGNzMUUr5IFMQpWIN.jpg",
    "Memento":                          "https://image.tmdb.org/t/p/w500/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg",
    "The Departed":                     "https://image.tmdb.org/t/p/w500/nT97ifVT2J1yMQmeq20Dqv6MbMI.jpg",
    "Whiplash":                         "https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    "The Prestige":                     "https://image.tmdb.org/t/p/w500/bdN3gXuIZYaJP7ftKK2sU0nPtEA.jpg",
    "Grave of the Fireflies":           "https://image.tmdb.org/t/p/w500/qG3RYlIVpTYclR9TYIsy8p7m7AT.jpg",
    "Django Unchained":                 "https://image.tmdb.org/t/p/w500/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg",
    "The Shining":                      "https://image.tmdb.org/t/p/w500/nRj5511mZdTl4saWEPoj9QroTIu.jpg",
    "WALL·E":                           "https://image.tmdb.org/t/p/w500/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg",
    "American Beauty":                  "https://image.tmdb.org/t/p/w500/wby9315QzVKdW9SAcnmIoVmZTYS.jpg",
    "Avengers: Infinity War":           "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
    "Spider-Man: Into the Spider-Verse":"https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
    "Joker":                            "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    "Oldboy":                           "https://image.tmdb.org/t/p/w500/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg",
    "Braveheart":                       "https://image.tmdb.org/t/p/w500/or1gBugydmjToAEq7OZY0owwFk.jpg",
    "Toy Story":                        "https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
    "Amélie":                           "https://image.tmdb.org/t/p/w500/slVnvaH6fpO0ypErsSoGMkbwCEh.jpg",
    "Coco":                             "https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg",
    "The Truman Show":                  "https://image.tmdb.org/t/p/w500/vuza0WtDlqalziPc94QSyMbrMQR.jpg",
    "Mad Max: Fury Road":               "https://image.tmdb.org/t/p/w500/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg",
    "Jurassic Park":                    "https://image.tmdb.org/t/p/w500/oU7Oez2kCqEbYVFnhKlsVkY00nF.jpg",
    "Deadpool":                         "https://image.tmdb.org/t/p/w500/3E53WEZJqP6aM84D8CckXx4pIHw.jpg",
    "Avatar":                           "https://image.tmdb.org/t/p/w500/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg",
}

def fix_posters():
    movies = Movie.objects.all()
    updated = 0
    not_found = []

    for movie in movies:
        title = movie.title.strip()
        if title in TMDB_POSTERS:
            new_poster = TMDB_POSTERS[title]
            if movie.poster != new_poster:
                old = movie.poster[:60] if movie.poster else "(empty)"
                movie.poster = new_poster
                movie.save()
                updated += 1
                print(f"  ✅ Updated: {title}")
            else:
                print(f"  ⏩ Already correct: {title}")
        else:
            not_found.append(title)
            print(f"  ❌ No TMDB poster mapped for: {title}")

    print(f"\n{'='*50}")
    print(f"Updated: {updated} movies")
    if not_found:
        print(f"Not found in map: {not_found}")
    print("Done!")

if __name__ == "__main__":
    fix_posters()
