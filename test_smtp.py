import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

def test_email():
    user = os.environ.get('EMAIL_HOST_USER')
    password = os.environ.get('EMAIL_HOST_PASSWORD')
    
    if not user or not password:
        print("❌ ERROR: EMAIL_HOST_USER or EMAIL_HOST_PASSWORD not found in .env file!")
        return

    print(f"--- CineBook SMTP Diagnostic ---")
    print(f"Testing with: {user}")
    print(f"Connecting to smtp.gmail.com:587...")

    msg = EmailMessage()
    msg.set_content(f"Success! Your CineBook SMTP settings for {user} are working perfectly.")
    msg['Subject'] = 'CineBook SendGrid Configuration Test'
    msg['From'] = 'nayakbhagyesh220@outlook.com' # Verified Sender
    msg['To'] = user # We can keep this or use the verified sender

    try:
        # Connect to SendGrid SMTP Relay
        with smtplib.SMTP('smtp.sendgrid.net', 587, timeout=15) as server:
            server.starttls() # Secure the connection
            server.login(user, password)
            server.send_message(msg)
        
        print(f"✅ SUCCESS: Email sent to {user}!")
        print(f"Check your inbox to confirm.")
    except smtplib.SMTPAuthenticationError:
        print(f"❌ FAILED: Authentication Error. Your Gmail App Password may be wrong.")
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")

if __name__ == "__main__":
    test_email()
