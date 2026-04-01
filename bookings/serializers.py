from rest_framework import serializers
from .models import Booking, Movie, Seat, Screening, Review


# ==========================
# Movie Serializer
# ==========================
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


# ==========================
# Screening Serializer  ← NEW
# ==========================
class ScreeningSerializer(serializers.ModelSerializer):
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    movie_poster = serializers.URLField(source='movie.poster', read_only=True)

    class Meta:
        model = Screening
        fields = [
            'id',
            'movie',
            'movie_title',
            'movie_poster',
            'date',
            'start_time',
            'hall',
            'price_per_seat',
            'is_active',
        ]


# ==========================
# Seat Serializer
# ==========================
class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = "__all__"


# ==========================
# Booking Serializer
# ==========================
class BookingSerializer(serializers.ModelSerializer):
    movie_title = serializers.SerializerMethodField()
    movie_poster = serializers.SerializerMethodField()
    screening_info = ScreeningSerializer(source='screening', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_id',
            'movie',
            'screening',
            'screening_info',
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

    def get_movie_title(self, obj):
        # Prefer screening's movie, fallback to direct movie FK
        if obj.screening:
            return obj.screening.movie.title
        if obj.movie:
            return obj.movie.title
        return None

    def get_movie_poster(self, obj):
        if obj.screening:
            return obj.screening.movie.poster
        if obj.movie:
            return obj.movie.poster
        return None


# ==========================
# Review Serializer (PHASE 2)
# ==========================
class ReviewSerializer(serializers.ModelSerializer):
    # This automatically grabs the username from the User ForeignKey relationship
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'user',
            'user_name',
            'movie',
            'rating',
            'comment',
            'created_at'
        ]
        # Prevents users from fabricating who they are, the view logic injects 'user'
        read_only_fields = ['id', 'user', 'created_at']

    # Custom validation to ensure rating is explicitly between 1 and 5
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value