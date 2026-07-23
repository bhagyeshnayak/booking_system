import requests
import random

email = f"nayakbhagyesh220+test{random.randint(1000, 9999)}@gmail.com"
username = f"testuser_{random.randint(1000, 9999)}"

url = "http://127.0.0.1:8000/api/auth/register/" 
data = {
    "username": username,
    "email": email,
    "password": "SecurePassword123!"
}

print(f"Attempting to register new customer:\nUsername: {username}\nEmail: {email}\n")
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    print("\nIf successful, an OTP verification email has been sent to your Gmail inbox (it may appear under 'nayakbhagyesh220@gmail.com').")
except Exception as e:
    print(f"Error: {e}")
