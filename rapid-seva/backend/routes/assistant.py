from flask import Blueprint, request, jsonify
from services.ai_service import assistant_reply

assistant_bp = Blueprint("assistant", __name__)

@assistant_bp.route("/assistant", methods=["POST"])
def assistant():
    data = request.json
    reply = assistant_reply(data["query"])
    return jsonify({"response": reply})