def calculate_score(time, traffic, severity, hospital_score):
    base = 100

    time_penalty = time * 1.5
    traffic_penalty = traffic * 10

    severity_map = {
        "low": 5,
        "medium": 10,
        "high": 20,
        "critical": 30
    }

    score = base - time_penalty - traffic_penalty - severity_map.get(severity, 10)
    score += hospital_score

    return max(0, min(100, score))