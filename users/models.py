from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    # This is the user's primary email, which must be unique in our database.
    email = models.EmailField(unique=True)  
    
    # An optional phone number field for the user profile. Max 15 characters.
    phone = models.CharField(max_length=15, blank=True, null=True)
    
    # --- PHASE 2 FIELDS: EMAIL OTP VERIFICATION ---
    
    # Boolean flag to check if the user has verified their email via OTP. Defaults to False.
    is_email_verified = models.BooleanField(default=False)
    
    # String field to store the 6-digit OTP sent to the user's email. Can be empty/null safely.
    email_otp = models.CharField(max_length=6, blank=True, null=True)
    
    # Timestamp to remember when the OTP was generated, to enforce expiration (e.g. 10 mins).
    email_otp_created_at = models.DateTimeField(blank=True, null=True)

    # We tell Django to use 'email' for login instead of the default 'username'.
    USERNAME_FIELD = 'email'
    
    # When creating a superuser from terminal, it will ask for 'username' besides 'email'.
    REQUIRED_FIELDS = ['username']
    
    # The string representation of this model. Very helpful in the Django admin panel!
    def __str__(self):
        return self.email