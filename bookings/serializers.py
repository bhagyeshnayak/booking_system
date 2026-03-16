from rest_framework import serializers
from .models import Booking, Movie ,Seat


class BookingSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    movie_poster = serializers.URLField(source='movie.poster', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_id',
            'movie',
            'movie_title',
            'movie_poster',
            'name',
            'email',
            'seats',
            'seat_numbers',
            'status',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'booking_id',
            'status',
            'created_at',
            'updated_at',
        ]


class MovieSerializer(serializers.ModelSerializer):

    class Meta:
        model = Movie
        fields = [
            "id",
            "title",
            "description",
            "poster",
            "duration",
            "genre",
            "rating",
        ]
class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = "__all__"