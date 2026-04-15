import uuid
from django.db import models
from django.conf import settings


# ==========================
# Movie Model
# ==========================
class Movie(models.Model):

    title = models.CharField(max_length=200)

    description = models.TextField(blank=True)

    poster = models.URLField(default="", max_length=500)

    duration = models.IntegerField(default=120)  # minutes

    genre = models.CharField(max_length=100, default="")

    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)

    # ── TMDB Integration Fields ─────────────────────────────────────────────
    # Stores the TMDB movie ID so we can get-or-create a local Movie
    # record when a user books a movie fetched from TMDB.
    tmdb_id = models.IntegerField(
        null=True, blank=True, unique=True,
        help_text="TMDB movie ID (null for locally-added movies)"
    )

    # Release date synced from TMDB
    release_date = models.DateField(
        null=True, blank=True,
        help_text="Release date from TMDB or manually set"
    )

    def __str__(self):
        return self.title


# ==========================
# Screening Model  ← NEW in Phase 1
# ==========================
class Screening(models.Model):
    """
    A specific showing of a movie at a date, time, and hall.
    A user books a Screening, not just a Movie.
    Example: Avengers | 2025-04-01 | 18:30 | Hall A | ₹250
    """
    HALL_CHOICES = [
        ('HALL_A', 'Hall A'),
        ('HALL_B', 'Hall B'),
        ('HALL_C', 'Hall C'),
    ]

    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        related_name="screenings"
    )

    date = models.DateField()

    start_time = models.TimeField()

    hall = models.CharField(max_length=20, choices=HALL_CHOICES, default='HALL_A')

    price_per_seat = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=250.00  # ₹250 default
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Same movie can't have two screenings in the same hall at the same time/date
        unique_together = ('movie', 'date', 'start_time', 'hall')
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.movie.title} | {self.date} {self.start_time} | {self.hall}"


# ==========================
# Seat Model  ← Updated: now per Screening, not Movie
# ==========================
class Seat(models.Model):
    """
    A seat belongs to a specific Screening.
    So A1 is available for 3 PM but might be booked for 6 PM.
    """
    screening = models.ForeignKey(
        Screening,
        on_delete=models.CASCADE,
        related_name='seats',
        null=True,
        blank=True
    )

    # Keep movie FK for backward compatibility with old data
    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    seat_number = models.CharField(max_length=10)

    is_booked = models.BooleanField(default=False)

    def __str__(self):
        if self.screening:
            return f"{self.screening} - {self.seat_number}"
        return f"Seat {self.seat_number}"


# ==========================
# Booking Model  ← Updated: references Screening
# ==========================
class Booking(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
    ]

    booking_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
        null=True,
        blank=True
    )

    name = models.CharField(max_length=100, default="")
    email = models.EmailField(default="")

    seats = models.IntegerField(default=1)

    seat_numbers = models.CharField(max_length=255, default="")

    # Old FK — kept for backward compat with existing bookings
    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        related_name="bookings",
        null=True,
        blank=True
    )

    # New FK — use this for new bookings
    screening = models.ForeignKey(
        Screening,
        on_delete=models.SET_NULL,
        related_name="bookings",
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    otp = models.CharField(max_length=6, blank=True, null=True)

    otp_created_at = models.DateTimeField(blank=True, null=True)

    qr_code = models.ImageField(upload_to="qr_codes/", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.user:
            return f"{self.booking_id} - {self.user}"
        return str(self.booking_id)


# ==========================
# Review Model (PHASE 2)
# ==========================
class Review(models.Model):
    # Link the review to the User who wrote it
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    # Link the review to the Movie being reviewed
    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    # Restrict rating to integer values between 1 and 5
    rating = models.IntegerField(
        choices=[(i, i) for i in range(1, 6)]
    )

    # Optional text comment from the user
    comment = models.TextField(blank=True, null=True)

    # Timestamp for when the review was posted
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Prevent a single user from leaving multiple reviews for the same movie!
        unique_together = ('user', 'movie')

    def __str__(self):
        return f"{self.user} - {self.movie.title} ({self.rating}/5)"