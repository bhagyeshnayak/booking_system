from django.urls import path
from .views import RegisterView, LoginView, VerifyEmailOTPView, UserProfileView

urlpatterns = [
    # --- PHASE 2 AUTH ROUTES ---
    
    # Standard account creation route. Returns a 201 Created empty response if successful.
    path('register/', RegisterView.as_view(), name='register'),
    
    # Endpoint accepting OTP tokens. Users must hit this to unlock their full account!
    path('verify-email/', VerifyEmailOTPView.as_view(), name='verify-email'),
    
    # Issues Refresh and Access JWT tokens ONLY if the email is verified and credentials match.
    path('login/', LoginView.as_view(), name='login'),
    
    # The authenticated endpoint to GET or PUT their personal profile fields.
    path('profile/', UserProfileView.as_view(), name='profile'),
]