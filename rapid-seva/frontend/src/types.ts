export type Severity = 'LOW' | 'MEDIUM' | 'CRITICAL';

export interface Location {
  lat: number;
  lng: number;
}

export interface Case {
  id: string;
  patientName: string;
  description: string;
  severity: Severity;
  location: Location;
  timestamp: number;
  status: 'PENDING' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED';
  ambulanceId?: string;
  hospitalId?: string;
}

export interface Hospital {
  id: string;
  name: string;
  location: Location;
  hasICU: boolean;
  availableBeds: number;
  totalBeds: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  location: Location;
  isAvailable: boolean;
}

export interface Volunteer {
  id: string;
  name: string;
  location: Location;
  helping: boolean;
}

export type Role = 'PATIENT' | 'AMBULANCE' | 'HOSPITAL' | 'DOCTOR';
