from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create a superuser if it doesn\'t exist'

    def handle(self, *args, **options):
        User = get_user_model()
        email = 'admin@gmail.com'
        username = 'admin1'
        password = 'admin@1611'

        try:
            user = User.objects.get(email=email)
            user.is_email_verified = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Admin {email} already exists - ensuring is_email_verified=True'))
        except User.DoesNotExist:
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                is_email_verified=True
            )
            self.stdout.write(self.style.SUCCESS(f'Admin {email} created successfully'))
