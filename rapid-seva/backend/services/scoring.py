def calculate_score(time_minutes: float, traffic_level: float, severity: str) -> float:
    """
    Golden Hour Survival Score
    time_minutes: estimated response time in minutes
    traffic_level: 0-10 scale (0=clear, 10=gridlock)
    severity: low | medium | high | critical
    Returns: score 0-100
    """
    base = 100
    time_penalty = time_minutes * 1.5
    traffic_penalty = traffic_level * 10
    severity_penalty = {'low': 5, 'medium': 10, 'high': 20, 'critical': 30}.get(severity, 10)

    score = base - time_penalty - traffic_penalty - severity_penalty
    return round(max(0.0, min(100.0, score)), 1)
