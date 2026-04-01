# Pull the official, lightweight Python 3.11 Docker Image
FROM python:3.11-slim

# Tell Python not to write .pyc bytecode files
ENV PYTHONDONTWRITEBYTECODE=1

# Tell Python to output logs to standard out directly without buffering
ENV PYTHONUNBUFFERED=1

# Create and set our working directory globally for the container
WORKDIR /app

# Upgrade pip locally inside the container
RUN pip install --upgrade pip

# Copy only the requirements file first. Docker will Cache this layer, 
# meaning future builds are insanely fast if you only edited code!
COPY requirements.txt .

# Tell pip to install all the dependencies exactly as we had them locally
RUN pip install -r requirements.txt

# Now copy the entirety of our actual Source Code into the container
COPY . .

# Run collectstatic to let Django+Whitenoise compress our CSS/JS for prod
# using dummy env vars just to let the script run successfully
RUN DB_HOST='dummy' DB_PASSWORD='dummy' SECRET_KEY='dummy' python manage.py collectstatic --no-input

# Expose port 8000 externally so browsers can hit the container
EXPOSE 8000

# The command executed when the container spins up: GUNICORN Web Server!
# We point to `booking_system.wsgi:application` because that's our Django entrypoint.
CMD ["gunicorn", "booking_system.wsgi:application", "--bind", "0.0.0.0:8000"]
