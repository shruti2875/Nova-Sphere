from flask import Flask
from flask_cors import CORS

from routes.patient import patient_bp
from routes.Hospital import hospital_bp
from routes.ambulance import ambulance_bp
from routes.doctor import doctor_bp
from routes.assistant import assistant_bp
app = Flask(__name__)
CORS(app)

app.register_blueprint(patient_bp)
app.register_blueprint(hospital_bp)
app.register_blueprint(ambulance_bp)
app.register_blueprint(doctor_bp)
app.register_blueprint(assistant_bp)

if __name__ == "__main__":
    app.run(debug=True)