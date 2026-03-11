from rest_framework import serializers
from .models import Booking, Movie ,Seat


class BookingSerializer(serializers.ModelSerializer):

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_id',
            'movie',
            'name',
            'email',
            'seats',
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