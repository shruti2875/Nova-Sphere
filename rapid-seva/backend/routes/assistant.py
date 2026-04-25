from flask import Blueprint, request, jsonify
from services.ai_service import assistant_reply

assistant_bp = Blueprint('assistant', __name__)


@assistant_bp.route('/assistant', methods=['POST'])
def assistant():
    data = request.get_json()
    query = data.get('query', '') or data.get('message', '')
    if not query:
        return jsonify({'error': 'query required'}), 400
    return jsonify({'response': assistant_reply(query)})
