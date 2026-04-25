from flask import Blueprint, jsonify

hospital_bp = Blueprint("hospital", __name__)

@hospital_bp.route("/hospitals", methods=["GET"])
def get_hospitals():
    import json
    with open("data/hospitals.json") as f:
        return jsonify(json.load(f))