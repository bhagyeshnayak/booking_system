import secrets
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.generics import ListAPIView

from django.contrib.auth import get_user_model
from bookings.models import Booking
from bookings.serializers import BookingSerializer
from .serializers import RegisterSerializer

# Get the custom User model defined in users/models.py
User = get_user_model()


# ==========================================
# 1. REGISTER VIEW (PHASE 2 OTP IMPLEMENTED)
# ==========================================
class RegisterView(APIView):
    # Anyone can hit this endpoint, no token required.
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Provide the data to our new RegisterSerializer
        serializer = RegisterSerializer(data=request.data)
        
        # 2. Let the serializer do the hard work of validating email/username uniqueness!
        if serializer.is_valid():
            # 3. Save the user (this calls create_user safely inside the serializer)
            user = serializer.save()
            
            # 4. Automatically generate a 6-digit OTP using the secrets library (secure random).
            otp = str(secrets.randbelow(900000) + 100000)
            
            # 5. Add the OTP details before saving. They are NOT verified yet.
            user.email_otp = otp
            user.email_otp_created_at = timezone.now()
            user.is_email_verified = False  # Need verification to login!
            user.save()

            # 6. Send the OTP via Email to the user immediately.
            try:
                send_mail(
                    subject='Welcome to CineBook - Verify Your Email',
                    message=f'Hello {user.username},\n\nYour OTP for email verification is: {otp}\n\nThis OTP is valid for 10 minutes.',
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception as e:
                # If email fails, delete the zombie user and return a JSON error
                print(f"Error sending OTP email: {e}")
                user.delete()
                return Response(
                    {"error": "Failed to send verification email. Please try again later or check your email provider."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # 7. Return success signal telling them to check their inbox. 
            return Response(
                {
                    "message": "Account created! Please check your email for the OTP to verify.",
                    "email": user.email
                },
                status=status.HTTP_201_CREATED
            )
            
        # If there are any validation errors (like email exists), it automatically builds the error map
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# 2. VERIFY EMAIL OTP VIEW (NEW!)
# ==========================================
class VerifyEmailOTPView(APIView):
    # Anyone can hit this endpoint, but they need their email and OTP code.
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Extract email and frontend OTP code from the raw JSON body input.
        email = request.data.get("email")
        otp = request.data.get("otp")

        # 2. Return an error if they are missing required data.
        if not email or not otp:
            return Response({"error": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Attempt to fetch the specific user from the SQLite/MySQL database by email.
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "User with this email not found."}, status=status.HTTP_404_NOT_FOUND)

        # 4. Have they already verified their email? If so, tell them.
        if user.is_email_verified:
            return Response({"message": "Email is already verified."}, status=status.HTTP_200_OK)

        # 5. Check if they have an OTP setup and if the OTP string matches what they submitted.
        if user.email_otp != otp:
            return Response({"error": "Invalid OTP code."}, status=status.HTTP_400_BAD_REQUEST)

        # 6. Check if the OTP is expired (we enforce a strict 10-minute validity window here).
        if user.email_otp_created_at:
            time_difference = timezone.now() - user.email_otp_created_at
            if time_difference > timedelta(minutes=10):
                return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        # 7. Success! OTP matches and isn't expired. Set their status as Verified.
        user.is_email_verified = True
        user.email_otp = None  # Security practice: nullify the OTP once used
        user.email_otp_created_at = None
        user.save()

        return Response({"message": "Email verified successfully! You can now log in."}, status=status.HTTP_200_OK)


# ==========================================
# 3. LOGIN VIEW
# ==========================================
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Load their credentials.
        email    = request.data.get("email", "").strip()
        password = request.data.get("password", "")

        # 2. Validate input is there.
        if not email or not password:
            return Response(
                {"error": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Fetch the actual database model record
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 4. Make sure passwords match (uses Django's secure hashing `check_password`).
        if not user.check_password(password):
            return Response(
                {"detail": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        # 5. NEW PHASE 2 CHECK: Prevent login if email is NOT verified via OTP yet!
        if not user.is_email_verified:
            return Response(
                {"error": "Email is not verified. Please verify your email via OTP first."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 6. Success! Give the user simplejwt refresh and access tokens.
        refresh = RefreshToken.for_user(user)

        return Response({
            "access":   str(refresh.access_token),
            "refresh":  str(refresh),
            "username": user.username,
            "email":    user.email,
        })
        

# ==========================================
# 4. USER PROFILE VIEW (NEW!)
# ==========================================
class UserProfileView(APIView):
    # Security: Ensure ONLY logged-in users sending a valid JWT token can access this.
    permission_classes = [IsAuthenticated]

    # Handle incoming GET requests to view the profile.
    def get(self, request):
        user = request.user
        # We manually serialize the JSON data we want to send back out of `user` object.
        return Response({
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "is_email_verified": user.is_email_verified
        }, status=status.HTTP_200_OK)

    # Handle incoming PUT requests to update profile fields.
    def put(self, request):
        # 'request.user' automatically grabs the User model of Whoever Sent the JWT. 
        user = request.user
        
        # Conditionally overwrite elements using the .get() fallback pattern.
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name  = request.data.get("last_name", user.last_name)
        user.phone      = request.data.get("phone", user.phone)
        
        # Perform SQL Update query
        user.save()
        
        # Alert the frontend!
        return Response({"message": "Profile updated successfully!"}, status=status.HTTP_200_OK)


# ==========================================
# 5. USER'S OWN BOOKINGS
# ==========================================
class UserBookingsView(ListAPIView):
    serializer_class = BookingSerializer
    # They absolutely must be logged in. 
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter the universal Bookings Table down to ONLY the bookings owned by `request.user`!
        return Booking.objects.filter(user=self.request.user).order_by("-created_at")