import math


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns distance in kilometers using Haversine formula."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def calculate_distance(lat1, lng1, lat2, lng2) -> float:
    return haversine(lat1, lng1, lat2, lng2)
