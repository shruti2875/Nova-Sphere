from flask import Blueprint, request, jsonify
from services.ai_service import detect_severity
from services.notification_service import notify_critical_case

patient_bp = Blueprint('patient', __name__)


@patient_bp.route('/create-case-ai', methods=['POST'])
def create_case_ai():
    data = request.get_json()
    description = data.get('description', '')
    lat = data.get('lat', 0)
    lng = data.get('lng', 0)

    if not description:
        return jsonify({'error': 'description required'}), 400

    severity, is_cardiac, survival_score = detect_severity(description)

    if severity == 'critical':
        notify_critical_case({
            'patientName': data.get('patientName', 'Unknown'),
            'description': description,
            'lat': lat,
            'lng': lng,
        })

    return jsonify({
        'severity': severity,
        'isCardiac': is_cardiac,
        'survivalScore': survival_score,
    })
