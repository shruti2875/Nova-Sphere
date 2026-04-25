import json
from services.geo_service import calculate_distance

def get_nearby_doctors(lat, lng):
    with open("data/doctors.json") as f:
        doctors = json.load(f)

    nearby = sorted(
        doctors,
        key=lambda d: calculate_distance(lat, lng, d["lat"], d["lng"])
    )

    return nearby[:3]


def get_nearby_users(lat, lng):
    with open("data/users.json") as f:
        users = json.load(f)

    return users[:5]