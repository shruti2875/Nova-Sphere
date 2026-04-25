import os
import json
from services.geo_service import calculate_distance

# Twilio credentials — set these in backend/.env or system environment variables
TWILIO_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_FROM = os.environ.get('TWILIO_FROM_NUMBER', '')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')


def _get_twilio_client():
    try:
        from twilio.rest import Client
        if TWILIO_SID and TWILIO_TOKEN:
            return Client(TWILIO_SID, TWILIO_TOKEN)
    except ImportError:
        pass
    return None


def send_sms(to: str, message: str) -> bool:
    client = _get_twilio_client()
    if not client:
        print(f"[SMS MOCK] To: {to} | {message}")
        return False
    try:
        client.messages.create(body=message, from_=TWILIO_FROM, to=to)
        return True
    except Exception as e:
        print(f"[SMS ERROR] {e}")
        return False


def send_whatsapp(to: str, message: str) -> bool:
    client = _get_twilio_client()
    if not client:
        print(f"[WHATSAPP MOCK] To: {to} | {message}")
        return False
    try:
        client.messages.create(body=message, from_=TWILIO_WHATSAPP_FROM, to=f'whatsapp:{to}')
        return True
    except Exception as e:
        print(f"[WHATSAPP ERROR] {e}")
        return False


def make_call(to: str, message: str) -> bool:
    client = _get_twilio_client()
    if not client:
        print(f"[CALL MOCK] To: {to} | {message}")
        return False
    try:
        twiml = f'<Response><Say>{message}</Say></Response>'
        client.calls.create(twiml=twiml, from_=TWILIO_FROM, to=to)
        return True
    except Exception as e:
        print(f"[CALL ERROR] {e}")
        return False


def notify_critical_case(case: dict):
    """Send SMS + WhatsApp + call for critical cases."""
    msg = (
        f"CRITICAL EMERGENCY - Rapid Seva Alert\n"
        f"Patient: {case.get('patientName', 'Unknown')}\n"
        f"Description: {case.get('description', '')}\n"
        f"Location: {case.get('lat')}, {case.get('lng')}\n"
        f"Severity: CRITICAL\n"
        f"Please respond immediately!"
    )
    print(f"[CRITICAL ALERT] {msg}")
    return msg


def get_nearby_doctors(lat: float, lng: float, limit: int = 3):
    try:
        with open('data/doctors.json') as f:
            doctors = json.load(f)
        sorted_docs = sorted(
            doctors,
            key=lambda d: calculate_distance(lat, lng, d.get('lat', 0), d.get('lng', 0))
        )
        result = []
        for d in sorted_docs[:limit]:
            d['distance_km'] = round(calculate_distance(lat, lng, d.get('lat', 0), d.get('lng', 0)), 2)
            result.append(d)
        return result
    except Exception:
        return []


def get_nearby_users(lat: float, lng: float, limit: int = 5):
    try:
        with open('data/users.json') as f:
            users = json.load(f)
        return users[:limit]
    except Exception:
        return []
