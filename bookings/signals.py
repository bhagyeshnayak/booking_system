from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from .models import Review, Movie

# This entire file is dedicated to "Signals". 
# Signals are Django's way of saying: "Hey, when [Event X] happens, automatically trigger [Function Y]!"

@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_movie_average_rating(sender, instance, **kwargs):
    """
    Every time a Review is created, updated (post_save), or deleted (post_delete),
    this function runs. It recalculates the average rating for the movie attached to that review.
    """
    
    # 1. Grab the specific movie this review was written for
    movie = instance.movie
    
    # 2. Ask the database to calculate the mathematical average (Avg) of ALL ratings for this movie
    # `.aggregate()` returns a dictionary like this: {'rating__avg': 4.5}
    average_data = Review.objects.filter(movie=movie).aggregate(Avg('rating'))
    
    # 3. Extract that computed average number
    new_average = average_data['rating__avg']
    
    # 4. If there are no reviews left (due to deletion), new_average will be None, so we default it to 0.0
    if new_average is None:
        new_average = 0.0
        
    # 5. Save the new calculated average permanently on the Movie model!
    movie.rating = new_average
    movie.save()
