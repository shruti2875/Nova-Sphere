CRITICAL_KEYWORDS = [
    'heart attack', 'cardiac arrest', 'not breathing', 'unconscious', 'unresponsive',
    'stroke', 'major accident', 'severe bleeding', 'head injury', 'no pulse',
]
HIGH_KEYWORDS = [
    'bleeding', 'fracture', 'broken bone', 'chest pain', 'difficulty breathing',
    'seizure', 'burn', 'deep cut', 'fall', 'hit by vehicle',
]
MEDIUM_KEYWORDS = [
    'pain', 'fever', 'vomiting', 'dizzy', 'breathe', 'faint', 'weak',
    'allergic', 'swelling', 'nausea',
]
CARDIAC_KEYWORDS = ['heart', 'cardiac', 'chest', 'pulse', 'palpitation']

SURVIVAL_SCORES = {'critical': 42, 'high': 60, 'medium': 75, 'low': 90}


def detect_severity(description: str):
    d = description.lower()

    is_cardiac = any(k in d for k in CARDIAC_KEYWORDS)

    if any(k in d for k in CRITICAL_KEYWORDS):
        return 'critical', is_cardiac, SURVIVAL_SCORES['critical']
    if any(k in d for k in HIGH_KEYWORDS):
        return 'high', is_cardiac, SURVIVAL_SCORES['high']
    if any(k in d for k in MEDIUM_KEYWORDS):
        return 'medium', is_cardiac, SURVIVAL_SCORES['medium']
    return 'low', False, SURVIVAL_SCORES['low']


ASSISTANT_RESPONSES = {
    'cpr': (
        "CPR Instructions:\n"
        "1. Check responsiveness — tap shoulders, shout.\n"
        "2. Call emergency services (112).\n"
        "3. Place heel of hand on center of chest.\n"
        "4. Push hard and fast — 100-120 compressions/min.\n"
        "5. Give 2 rescue breaths after every 30 compressions.\n"
        "6. Continue until help arrives."
    ),
    'heart': (
        "Heart Attack Response:\n"
        "1. Call 112 immediately.\n"
        "2. Have patient sit or lie down — do NOT let them walk.\n"
        "3. Loosen tight clothing.\n"
        "4. Give aspirin (325mg) if available and not allergic.\n"
        "5. Be ready to perform CPR if they lose consciousness."
    ),
    'bleed': (
        "Bleeding Control:\n"
        "1. Apply firm, direct pressure with clean cloth.\n"
        "2. Do NOT remove the cloth — add more on top.\n"
        "3. Elevate the injured area above heart level.\n"
        "4. For severe limb bleeding — apply tourniquet 5cm above wound.\n"
        "5. Call 112 immediately."
    ),
    'stroke': (
        "Stroke Response — Use FAST:\n"
        "F — Face drooping?\n"
        "A — Arm weakness?\n"
        "S — Speech difficulty?\n"
        "T — Time to call 112!\n"
        "Do NOT give food or water. Keep patient calm and still."
    ),
    'burn': (
        "Burn Treatment:\n"
        "1. Cool the burn with cool (not cold) running water for 10-20 min.\n"
        "2. Do NOT use ice, butter, or toothpaste.\n"
        "3. Cover loosely with clean non-fluffy material.\n"
        "4. For large/deep burns — call 112 immediately."
    ),
    'chok': (
        "Choking Response:\n"
        "1. Encourage coughing if they can.\n"
        "2. Give 5 firm back blows between shoulder blades.\n"
        "3. Give 5 abdominal thrusts (Heimlich maneuver).\n"
        "4. Alternate back blows and abdominal thrusts.\n"
        "5. Call 112 if object not dislodged."
    ),
    'accident': (
        "Accident Response:\n"
        "1. Call 112 immediately.\n"
        "2. Do NOT move the patient unless in immediate danger.\n"
        "3. Control any bleeding with direct pressure.\n"
        "4. Keep patient warm and still.\n"
        "5. Monitor breathing until help arrives."
    ),
}


def assistant_reply(query: str) -> str:
    q = query.lower()
    for keyword, response in ASSISTANT_RESPONSES.items():
        if keyword in q:
            return response
    return (
        "General Emergency Advice:\n"
        "1. Stay calm — panic makes things worse.\n"
        "2. Call 112 (India emergency number) immediately.\n"
        "3. Keep the patient still and comfortable.\n"
        "4. Do not give food or water unless instructed.\n"
        "5. Stay on the line with emergency services."
    )
