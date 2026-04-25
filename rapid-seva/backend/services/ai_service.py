def detect_severity(description):
    description = description.lower()

    if "heart attack" in description:
        return "critical", True

    if "bleeding" in description:
        return "high", False

    if "pain" in description:
        return "medium", False

    return "low", False


def assistant_reply(query):
    query = query.lower()

    if "cpr" in query or "heart" in query:
        return "Perform CPR: Push chest 100-120 times per minute."

    if "bleeding" in query:
        return "Apply firm pressure to stop bleeding."

    return "Stay calm and call emergency services."