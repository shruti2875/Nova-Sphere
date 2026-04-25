import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Case, Hospital, Doctor, Volunteer, Role, Severity } from '../types';

interface AppContextType {
  cases: Case[];
  hospitals: Hospital[];
  doctors: Doctor[];
  volunteers: Volunteer[];
  currentRole: Role | null;
  setRole: (role: Role | null) => void;
  createCase: (caseData: Omit<Case, 'id' | 'timestamp' | 'status'>) => void;
  acceptCase: (caseId: string, ambulanceId: string) => void;
  updateCaseStatus: (caseId: string, status: Case['status']) => void;
  registerHospital: (hospital: Omit<Hospital, 'id'>) => void;
  registerDoctor: (doctor: Omit<Doctor, 'id'>) => void;
  registerVolunteer: (volunteer: Omit<Volunteer, 'id'>) => void;
  updateDoctorAvailability: (doctorId: string, available: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([
    { id: '1', name: 'City Central Hospital', location: { lat: 18.5204, lng: 73.8567 }, hasICU: true, availableBeds: 5, totalBeds: 50 },
    { id: '2', name: 'Lifeline Medical Center', location: { lat: 18.5304, lng: 73.8667 }, hasICU: true, availableBeds: 2, totalBeds: 30 }
  ]);
  const [doctors, setDoctors] = useState<Doctor[]>([
    { id: 'd1', name: 'Dr. Sharma', specialization: 'Cardiologist', location: { lat: 18.5104, lng: 73.8467 }, isAvailable: true },
    { id: 'd2', name: 'Dr. Patil', specialization: 'General Surgeon', location: { lat: 18.5404, lng: 73.8767 }, isAvailable: true }
  ]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);

  const setRole = (role: Role | null) => setCurrentRole(role);

  const playAlert = useCallback((severity: Severity) => {
    // Simulated sound alert
    console.log(`ALARM: New ${severity} case alert!`);
  }, []);

  const createCase = useCallback((caseData: Omit<Case, 'id' | 'timestamp' | 'status'>) => {
    const newCase: Case = {
      ...caseData,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      status: 'PENDING',
    };
    setCases(prev => [newCase, ...prev]);
    playAlert(newCase.severity);
    
    if (newCase.severity === 'CRITICAL') {
      window.dispatchEvent(new CustomEvent('emergency-alert', { detail: newCase }));
    }
  }, [playAlert]);

  const acceptCase = useCallback((caseId: string, ambulanceId: string) => {
    setCases(prev => prev.map(c => 
      c.id === caseId ? { ...c, status: 'ACCEPTED', ambulanceId } : c
    ));
  }, []);

  const updateCaseStatus = useCallback((caseId: string, status: Case['status']) => {
    setCases(prev => prev.map(c => c.id === caseId ? { ...c, status } : c));
  }, []);

  const registerHospital = (hospital: Omit<Hospital, 'id'>) => {
    setHospitals(prev => [...prev, { ...hospital, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const registerDoctor = (doctor: Omit<Doctor, 'id'>) => {
    setDoctors(prev => [...prev, { ...doctor, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const registerVolunteer = (volunteer: Omit<Volunteer, 'id'>) => {
    setVolunteers(prev => [...prev, { ...volunteer, id: Math.random().toString(36).substr(2, 9) }]);
  };

  const updateDoctorAvailability = (doctorId: string, available: boolean) => {
    setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, isAvailable: available } : d));
  };

  return (
    <AppContext.Provider value={{
      cases, hospitals, doctors, volunteers, currentRole, setRole,
      createCase, acceptCase, updateCaseStatus, registerHospital, registerDoctor, registerVolunteer,
      updateDoctorAvailability
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
