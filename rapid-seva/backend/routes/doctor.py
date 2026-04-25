from flask import Blueprint, request, jsonify
from services.notification_service import get_nearby_doctors

doctor_bp = Blueprint("doctor", __name__)

@doctor_bp.route("/doctors", methods=["GET"])
def doctors():
    import json
    with open("data/doctors.json") as f:
        return jsonify(json.load(f))


@doctor_bp.route("/notify-doctors", methods=["POST"])
def notify():
    data = request.json
    doctors = get_nearby_doctors(data["lat"], data["lng"])
    return jsonify(doctors)