import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback-insecure-key-change-me')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

# Optional: set FRONTEND_URL to your production frontend (e.g. https://your-app.onrender.com)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://127.0.0.1:8000')


INSTALLED_APPS = [
    'jazzmin',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'bookings.apps.BookingsConfig',
    'users',
]

AUTH_USER_MODEL = 'users.User'

ROOT_URLCONF = 'booking_system.urls'


# ==============================
# Templates
# ==============================

TEMPLATES = [
{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',

    'DIRS': [BASE_DIR / "booking_system" / "templates"],

    'APP_DIRS': True,

    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ],
    },
},
]


WSGI_APPLICATION = 'booking_system.wsgi.application'


# ==============================
# Database
# ==============================

# DATABASES = {
# 'default': {
#     'ENGINE': 'django.db.backends.sqlite3',
#     'NAME': BASE_DIR / 'db.sqlite3',
# }
# }
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'booking_db'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '3306'),
    }
}

# ==============================
# Middleware
# ==============================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ==============================
# Internationalization
# ==============================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ==============================
# Static Files
# ==============================

STATIC_URL = '/static/'

STATICFILES_DIRS = [
    BASE_DIR / "static",
]

STATICFILES_DIRS = [
BASE_DIR / "booking_system" / "static",
]
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Define where collectstatic should dump all CSS and images so Whitenoise can serve them!
STATIC_ROOT = BASE_DIR / "staticfiles"



# ==============================
# Default PK
# ==============================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ==============================
# Django REST Framework
# ==============================

REST_FRAMEWORK = {
"DEFAULT_AUTHENTICATION_CLASSES": [
    "rest_framework_simplejwt.authentication.JWTAuthentication",
],
"DEFAULT_PERMISSION_CLASSES": [
    "rest_framework.permissions.IsAuthenticated",
],
"DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
"PAGE_SIZE": 5,
}


# ==============================
# CORS
# ==============================

CORS_ALLOW_ALL_ORIGINS = True

# ==============================
# Email Backend
# ==============================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

# ==============================
# Stripe Configuration
# ==============================
STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY', '')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')


# ==============================
# Redis Caching
# ==============================
# CACHES = {
#     "default": {
#         "BACKEND": "django_redis.cache.RedisCache",
#         "LOCATION": os.environ.get("REDIS_URL", "redis://127.0.0.1:6379/1"),
#         "OPTIONS": {
#             "CLIENT_CLASS": "django_redis.client.DefaultClient",
#         }
#     }
# }

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}


# ==============================
# Admin Customization (Jazzmin)
# ==============================
JAZZMIN_SETTINGS = {
    "site_title": "CineBook Admin",
    "site_header": "CineBook Dashboard",
    "site_brand": "CineBook Management",
    "welcome_sign": "Welcome back to CineBook HQ",
    "copyright": "CineBook Team Ltd",
    "search_model": ["users.User", "bookings.Booking"],
    "show_ui_builder": False,
    "topmenu_links": [
        {"name": "Home",  "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "View Site", "url": "/", "new_window": True},
    ],
    "order_with_respect_to": ["bookings", "users"],
    "icons": {
        "auth": "fas fa-users-cog",
        "users.User": "fas fa-user",
        "bookings.Movie": "fas fa-film",
        "bookings.Screening": "fas fa-clock",
        "bookings.Booking": "fas fa-ticket-alt",
        "bookings.Review": "fas fa-star",
    },
}

import sys
if 'test' in sys.argv or 'runserver' in sys.argv:
    # Use standard RAM while running local manage.py scripts so we don't crash 
    # trying to connect to a Redis server that isn't running on your laptop!
    CACHES['default'] = {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}
