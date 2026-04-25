from flask import Blueprint, jsonify, request
import json

ambulance_bp = Blueprint("ambulance", __name__)

@ambulance_bp.route("/cases", methods=["GET"])
def get_cases():
    with open("data/cases.json") as f:
        return jsonify(json.load(f))


@ambulance_bp.route("/accept-case", methods=["POST"])
def accept_case():
    data = request.json

    with open("data/cases.json", "r+") as f:
        cases = json.load(f)

        for case in cases:
            if case["case_id"] == data["case_id"]:
                case["status"] = "assigned"

        f.seek(0)
        json.dump(cases, f)

    return jsonify({"message": "Case accepted"})