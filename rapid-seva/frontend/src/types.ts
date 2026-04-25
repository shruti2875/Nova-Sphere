export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type CaseStatus = 'pending' | 'assigned' | 'active' | 'completed';
export type Role = 'PATIENT' | 'AMBULANCE' | 'HOSPITAL' | 'DOCTOR' | 'CONSULT' | 'DOCTOR_CONSULT';

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface EmergencyCase {
  id: string;
  patientName: string;
  description: string;
  severity: Severity;
  isCardiac: boolean;
  lat: number;
  lng: number;
  status: CaseStatus;
  assignedAmbulance?: string;
  assignedHospital?: string;
  survivalScore: number;
  timestamp: number;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hasICU: boolean;
  availableBeds: number;
  totalBeds: number;
  specialization: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  lat: number;
  lng: number;
  isAvailable: boolean;
  phone: string;
}

export interface NearbyUser {
  id: string;
  name: string;
  lat: number;
  lng: number;
  isHelper: boolean;
}

export interface ScoreResult {
  score: number;
  severity: Severity;
  isCardiac: boolean;
}

// ── Teleconsultation Module ──────────────────────────────────────────────────
export type ConsultStatus = 'pending' | 'accepted' | 'rejected';

export interface ConsultRequest {
  id: string;
  patientName: string;
  problem: string;
  matchedKeywords: string[];
  targetDoctorId: string;
  targetDoctorName: string;
  status: ConsultStatus;
  timestamp: number;
  patientLat: number;
  patientLng: number;
}

export interface ChatMessage {
  id: string;
  consultId: string;
  sender: 'patient' | 'doctor';
  text: string;
  timestamp: number;
}
