import uuid
from django.db import models
from django.conf import settings


# ==========================
# Movie Model
# ==========================
class Movie(models.Model):

    title = models.CharField(max_length=200)

    description = models.TextField(blank=True)

    poster = models.URLField(default="")

    duration = models.IntegerField(default=120)  # minutes

    genre = models.CharField(max_length=100, default="")

    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# ==========================
# Booking Model
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

    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
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
# Seat Model
# ==========================
class Seat(models.Model):

    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)

    seat_number = models.CharField(max_length=10)

    is_booked = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.movie.title} - {self.seat_number}"