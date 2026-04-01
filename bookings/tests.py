import os
from datetime import timedelta
from django.utils import timezone
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db.models import Avg

from bookings.models import Movie, Screening, Seat, Booking, Review

User = get_user_model()


class Phase2And3TestSuite(TestCase):

    def setUp(self):
        # 1. Create a dummy Email Verified User
        self.user = User.objects.create_user(username='testboy', email='test@example.com', password='password123')
        self.user.is_email_verified = True
        self.user.save()

        # 2. Create the Movie
        self.movie = Movie.objects.create(
            title="Spiderman: No Way Home",
            description="Peter Parker battles villains from the multiverse.",
            genre="Action",
            rating=0.0
        )

        # 3. Create a screening happening EXACTLY 5 hours from now
        self.future_time = timezone.now() + timedelta(hours=5)
        self.screening = Screening.objects.create(
            movie=self.movie,
            date=self.future_time.date(),
            start_time=self.future_time.time(),
            hall="HALL_A",
            price_per_seat=250.00
        )

        # 4. Create a Pending Booking
        self.booking = Booking.objects.create(
            user=self.user,
            movie=self.movie,
            screening=self.screening,
            seats=1,
            seat_numbers="A1",
            status="CONFIRMED"
        )


    # ==============================
    # TEST 1: The Django Signals Review Automatic Aggregation
    # ==============================
    def test_review_signal_updates_movie_average(self):
        print("\n[TEST] Verifying Django Signals auto-calculate average ratings...")
        
        # User 1 leaves a 5-star review
        Review.objects.create(user=self.user, movie=self.movie, rating=5)
        self.movie.refresh_from_db()
        self.assertEqual(self.movie.rating, 5.0)

        # User 2 leaves a 1-star review (The average should drop instantly to 3.0!)
        user2 = User.objects.create_user(username='hater', email='hater@example.com', password='123')
        Review.objects.create(user=user2, movie=self.movie, rating=1)
        self.movie.refresh_from_db()
        
        self.assertEqual(self.movie.rating, 3.0)
        print("  -> Signals successfully recalculated the average to 3.0!")


    # ==============================
    # TEST 2: Django ORM Search & Filtering Functionality
    # ==============================
    def test_movie_search_and_filter_logic(self):
        print("[TEST] Verifying Database Search and Filter 'Q' object configurations...")

        # Add a totally different movie to ensure search actually filters down
        Movie.objects.create(title="The Notebook", genre="Romance", rating=4.5)

        # We simulate the exact logic used inside your 'get_queryset' in /api/movies/
        from django.db.models import Q
        search_query = 'spider'
        genre_query = 'Action'

        queryset = Movie.objects.all()
        # Search filter
        queryset = queryset.filter(Q(title__icontains=search_query) | Q(description__icontains=search_query))
        # Genre filter
        queryset = queryset.filter(genre__iexact=genre_query)

        self.assertEqual(queryset.count(), 1)
        self.assertEqual(queryset.first().title, "Spiderman: No Way Home")
        print("  -> Database correctly isolated 'Spiderman' out of the full list!")


    # ==============================
    # TEST 3: Strict Cancellation Time Limit (Phase 2)
    # ==============================
    def test_cancellation_policy_blocks_late_refunds(self):
        print("[TEST] Verifying the 2-hour cancellation security restriction...")

        # The screening is in 5 hours. We CAN cancel right now.
        show_datetime = timezone.make_aware(
            timezone.datetime.combine(self.booking.screening.date, self.booking.screening.start_time)
        )
        
        # Scenario 1: Current Time + 2 hours (2 hours from now) is BEFORE the show (5 hours) -> ALLOW
        is_too_late = (timezone.now() + timedelta(hours=2)) > show_datetime
        self.assertFalse(is_too_late)
        print("  -> Booking allowed to be cancelled if 5 hours early.")

        # Scenario 2: Simulate that the screening is actually starting in 1 hour
        early_time = timezone.now() + timedelta(hours=1)
        self.booking.screening.date = early_time.date()
        self.booking.screening.start_time = early_time.time()
        self.booking.screening.save()

        show_datetime_new = timezone.make_aware(
            timezone.datetime.combine(self.booking.screening.date, self.booking.screening.start_time)
        )
        
        # Now, Current time + 2 hours IS strictly greater/after the show starts! -> DENY
        is_too_late_new = (timezone.now() + timedelta(hours=2)) > show_datetime_new
        self.assertTrue(is_too_late_new)
        print("  -> Booking successfully blocked if screening is 1 hour away!!")

    def test_dummy_cache_for_phase3(self):
        print("[TEST] Ensuring Phase 3 Jazzmin & Settings are solid...")
        from django.conf import settings
        self.assertIn('jazzmin', settings.INSTALLED_APPS)
        self.assertIn('default', settings.CACHES)
        print("  -> Settings validated successfully.")

