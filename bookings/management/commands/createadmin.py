from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create a superuser if it doesn\'t exist'

    def handle(self, *args, **options):
        User = get_user_model()
        email = 'admin@gmail.com'
        username = 'admin1'
        password = 'admin@1611'

        if not User.objects.filter(email=email).exists():
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                is_email_verified=True  # Ensure the superuser is verified
            )
            self.stdout.write(self.style.SUCCESS('Admin created'))
        else:
            self.stdout.write(self.style.SUCCESS('Admin already exists'))
