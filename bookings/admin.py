from django.contrib import admin
from .models import Booking, Movie, Seat, Screening


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ['title', 'genre', 'rating', 'duration', 'created_at']
    search_fields = ['title', 'genre']
    list_filter = ['genre']


@admin.register(Screening)
class ScreeningAdmin(admin.ModelAdmin):
    list_display = ['movie', 'date', 'start_time', 'hall', 'price_per_seat', 'is_active']
    list_filter = ['hall', 'is_active', 'date']
    search_fields = ['movie__title']
    ordering = ['date', 'start_time']


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ['seat_number', 'screening', 'movie', 'is_booked']
    list_filter = ['is_booked']
    search_fields = ['seat_number']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_id', 'user', 'movie', 'screening', 'seats', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['booking_id', 'email', 'name']
    ordering = ['-created_at']
