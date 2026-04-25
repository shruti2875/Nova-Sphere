from flask import Blueprint, request, jsonify
import json
import uuid
import os

# Import services
from services.ai_service import detect_severity

patient_bp = Blueprint('patient', __name__)

DATA_PATH = os.path.join('data', 'cases.json')


def load_cases():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, 'r') as f:
        return json.load(f)


def save_cases(cases):
    with open(DATA_PATH, 'w') as f:
        json.dump(cases, f, indent=4)


@patient_bp.route('/create-case', methods=['POST'])
def create_case():
    try:
        data = request.get_json()

        description = data.get('description', '')
        lat = data.get('lat')
        lng = data.get('lng')

        if not description or lat is None or lng is None:
            return jsonify({"error": "Missing required fields"}), 400

        # AI Severity Detection
        severity, cardiac_case = detect_severity(description)

        # Generate unique case ID
        case_id = str(uuid.uuid4())[:8]

        # Create case object
        new_case = {
            "case_id": case_id,
            "description": description,
            "lat": lat,
            "lng": lng,
            "severity": severity,
            "cardiac_case": cardiac_case,
            "status": "pending"
        }

        # Save to JSON
        cases = load_cases()
        cases.append(new_case)
        save_cases(cases)

        return jsonify({
            "case_id": case_id,
            "severity": severity
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500