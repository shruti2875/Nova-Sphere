from flask import Blueprint, request, jsonify
from services.scoring import calculate_score

hospital_bp = Blueprint('hospital', __name__)


@hospital_bp.route('/calculate-score', methods=['POST'])
def score():
    data = request.get_json()
    time = float(data.get('time', 5))
    traffic = float(data.get('traffic', 3))
    severity = data.get('severity', 'medium')
    result = calculate_score(time, traffic, severity)
    return jsonify({'score': result})
