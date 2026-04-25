from flask import Blueprint, jsonify

ambulance_bp = Blueprint('ambulance', __name__)


@ambulance_bp.route('/ambulance/status', methods=['GET'])
def status():
    return jsonify({'status': 'active', 'unit': 'AMB-001'})
