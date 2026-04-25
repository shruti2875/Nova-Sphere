from flask import Blueprint, request, jsonify
from services.notification_service import get_nearby_doctors

doctor_bp = Blueprint('doctor', __name__)


@doctor_bp.route('/notify-doctors', methods=['POST'])
def notify_doctors():
    data = request.get_json()
    lat = data.get('lat', 0)
    lng = data.get('lng', 0)
    doctors = get_nearby_doctors(lat, lng)
    return jsonify({'doctors': doctors})
