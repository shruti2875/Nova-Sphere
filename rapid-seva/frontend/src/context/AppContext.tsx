import React, { createContext, useContext, useState } from 'react';
import { Case, Hospital, Doctor, Volunteer, Role } from '../types';

const API = 'http://localhost:8000';

interface AppContextType {
  cases: Case[];
  hospitals: Hospital[];
  doctors: Doctor[];
  currentRole: Role | null;
  setRole: (role: Role | null) => void;
  createCase: (caseData: { patientName: string; description: string; location: { lat: number; lng: number } }) => Promise<Case>;
  acceptCase: (caseId: string, ambulanceId: string) => Promise<void>;
  updateCaseStatus: (caseId: string, status: Case['status']) => Promise<void>;
  registerHospital: (hospital: Omit<Hospital, 'id'>) => Promise<void>;
  registerDoctor: (doctor: Omit<Doctor, 'id'>) => Promise<void>;
  updateDoctorAvailability: (doctorId: string, available: boolean) => Promise<void>;
  fetchCases: () => Promise<void>;
  fetchHospitals: () => Promise<void>;
  fetchDoctors: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);

  const setRole = (role: Role | null) => setCurrentRole(role);

  const fetchCases = async () => {
    const res = await fetch(`${API}/api/cases`);
    const data = await res.json();
    setCases(data);
  };

  const fetchHospitals = async () => {
    const res = await fetch(`${API}/api/hospitals`);
    const data = await res.json();
    setHospitals(data);
  };

  const fetchDoctors = async () => {
    const res = await fetch(`${API}/api/doctors`);
    const data = await res.json();
    setDoctors(data);
  };

  const createCase = async (caseData: { patientName: string; description: string; location: { lat: number; lng: number } }) => {
    const res = await fetch(`${API}/api/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData),
    });
    const newCase: Case = await res.json();
    setCases(prev => [newCase, ...prev]);
    if (newCase.severity === 'CRITICAL') {
      window.dispatchEvent(new CustomEvent('emergency-alert', { detail: newCase }));
    }
    return newCase;
  };

  const acceptCase = async (caseId: string, ambulanceId: string) => {
    await fetch(`${API}/api/cases/${caseId}/accept`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambulanceId }),
    });
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: 'ACCEPTED', ambulanceId } : c));
  };

  const updateCaseStatus = async (caseId: string, status: Case['status']) => {
    await fetch(`${API}/api/cases/${caseId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, status } : c));
  };

  const registerHospital = async (hospital: Omit<Hospital, 'id'>) => {
    const res = await fetch(`${API}/api/hospitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hospital),
    });
    const newHospital: Hospital = await res.json();
    setHospitals(prev => [...prev, newHospital]);
  };

  const registerDoctor = async (doctor: Omit<Doctor, 'id'>) => {
    const res = await fetch(`${API}/api/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctor),
    });
    const newDoctor: Doctor = await res.json();
    setDoctors(prev => [...prev, newDoctor]);
  };

  const updateDoctorAvailability = async (doctorId: string, available: boolean) => {
    await fetch(`${API}/api/doctors/${doctorId}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available }),
    });
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, isAvailable: available } : d));
  };

  return (
    <AppContext.Provider value={{
      cases, hospitals, doctors, currentRole, setRole,
      createCase, acceptCase, updateCaseStatus,
      registerHospital, registerDoctor, updateDoctorAvailability,
      fetchCases, fetchHospitals, fetchDoctors,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
