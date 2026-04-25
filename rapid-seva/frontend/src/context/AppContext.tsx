import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, updateDoc, doc, onSnapshot,
  query, orderBy, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { EmergencyCase, Hospital, Doctor, Role, Severity, ConsultRequest, ChatMessage } from '../types';
import { api } from '../api';

interface AppContextType {
  cases: EmergencyCase[];
  hospitals: Hospital[];
  doctors: Doctor[];
  consultRequests: ConsultRequest[];
  currentRole: Role | null;
  backendOnline: boolean;
  firestoreReady: boolean;
  setRole: (role: Role | null) => void;
  submitCase: (patientName: string, description: string, lat: number, lng: number) => Promise<EmergencyCase>;
  acceptCase: (caseId: string, ambulanceId: string) => Promise<void>;
  completeCase: (caseId: string) => Promise<void>;
  registerHospital: (data: Omit<Hospital, 'id'>) => Promise<void>;
  registerDoctor: (data: Omit<Doctor, 'id'>) => Promise<void>;
  toggleDoctorAvailability: (doctorId: string, available: boolean) => Promise<void>;
  updateAmbulanceLocation: (caseId: string, ambLat: number, ambLng: number) => Promise<void>;
  // Teleconsultation
  sendConsultRequest: (data: Omit<ConsultRequest, 'id'>) => Promise<string>;
  respondToConsult: (consultId: string, status: 'accepted' | 'rejected') => Promise<void>;
  sendChatMessage: (msg: Omit<ChatMessage, 'id'>) => Promise<void>;
  getChatMessages: (consultId: string, cb: (msgs: ChatMessage[]) => void) => () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function localSeverity(desc: string): { severity: Severity; isCardiac: boolean; survivalScore: number } {
  const d = desc.toLowerCase();
  const critical = ['heart attack', 'unconscious', 'not breathing', 'stroke', 'accident', 'cardiac', 'no pulse'];
  const high = ['bleeding', 'fracture', 'burn', 'chest pain', 'seizure', 'broken'];
  const medium = ['pain', 'fever', 'vomit', 'dizzy', 'breathe', 'faint', 'weak'];
  if (critical.some(k => d.includes(k))) return { severity: 'critical', isCardiac: d.includes('heart') || d.includes('cardiac') || d.includes('chest'), survivalScore: 42 };
  if (high.some(k => d.includes(k))) return { severity: 'high', isCardiac: false, survivalScore: 60 };
  if (medium.some(k => d.includes(k))) return { severity: 'medium', isCardiac: false, survivalScore: 75 };
  return { severity: 'low', isCardiac: false, survivalScore: 90 };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultRequests, setConsultRequests] = useState<ConsultRequest[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [firestoreReady, setFirestoreReady] = useState(false);
  const alertedIds = useRef<Set<string>>(new Set());

  // Check Flask backend health
  useEffect(() => {
    fetch('http://localhost:5000/health')
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  // Real-time Firestore listeners — with error handling for permission-denied
  useEffect(() => {
    const unsubCases = onSnapshot(
      query(collection(db, 'cases'), orderBy('timestamp', 'desc')),
      (snap) => {
        setFirestoreReady(true);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyCase));
        setCases(data);
        data.forEach(c => {
          if (c.severity === 'critical' && c.status === 'pending' && !alertedIds.current.has(c.id)) {
            alertedIds.current.add(c.id);
            window.dispatchEvent(new CustomEvent('emergency-alert', { detail: c }));
          }
        });
      },
      (err) => {
        console.warn('Firestore cases listener error:', err.code);
        if (err.code === 'permission-denied') {
          console.error(
            '%c⚠ Firestore Permission Denied\n' +
            'Go to Firebase Console → Firestore → Rules and set:\n\n' +
            'rules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}',
            'color: red; font-size: 14px;'
          );
        }
      }
    );

    const unsubHospitals = onSnapshot(
      collection(db, 'hospitals'),
      (snap) => setHospitals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital))),
      (err) => console.warn('Firestore hospitals error:', err.code)
    );

    const unsubDoctors = onSnapshot(
      collection(db, 'doctors'),
      (snap) => setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor))),
      (err) => console.warn('Firestore doctors error:', err.code)
    );

    const unsubConsults = onSnapshot(
      query(collection(db, 'consultRequests'), orderBy('timestamp', 'desc')),
      (snap) => setConsultRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConsultRequest))),
      (err) => console.warn('Firestore consultRequests error:', err.code)
    );

    return () => { unsubCases(); unsubHospitals(); unsubDoctors(); unsubConsults(); };
  }, []);

  const setRole = (role: Role | null) => setCurrentRole(role);

  const submitCase = async (patientName: string, description: string, lat: number, lng: number): Promise<EmergencyCase> => {
    const aiResult = await api.detectSeverity(description, lat, lng);
    const { severity, isCardiac, survivalScore } = aiResult ?? localSeverity(description);

    const caseData = {
      patientName,
      description,
      lat,
      lng,
      severity,
      isCardiac,
      survivalScore,
      status: 'pending' as const,
      assignedAmbulance: '',
      assignedHospital: '',
      timestamp: Date.now(),
    };

    const ref = await addDoc(collection(db, 'cases'), caseData);
    return { id: ref.id, ...caseData };
  };

  const acceptCase = async (caseId: string, ambulanceId: string) => {
    await updateDoc(doc(db, 'cases', caseId), {
      status: 'assigned',
      assignedAmbulance: ambulanceId,
    });
  };

  const completeCase = async (caseId: string) => {
    await updateDoc(doc(db, 'cases', caseId), { status: 'completed' });
  };

  const registerHospital = async (data: Omit<Hospital, 'id'>) => {
    await addDoc(collection(db, 'hospitals'), data);
  };

  const registerDoctor = async (data: Omit<Doctor, 'id'>) => {
    await addDoc(collection(db, 'doctors'), data);
  };

  const toggleDoctorAvailability = async (doctorId: string, available: boolean) => {
    await updateDoc(doc(db, 'doctors', doctorId), { isAvailable: available });
  };

  const updateAmbulanceLocation = async (caseId: string, ambLat: number, ambLng: number) => {
    await updateDoc(doc(db, 'cases', caseId), { ambLat, ambLng });
  };

  // Teleconsultation methods
  const sendConsultRequest = async (data: Omit<ConsultRequest, 'id'>): Promise<string> => {
    const ref = await addDoc(collection(db, 'consultRequests'), data);
    return ref.id;
  };

  const respondToConsult = async (consultId: string, status: 'accepted' | 'rejected') => {
    await updateDoc(doc(db, 'consultRequests', consultId), { status });
  };

  const sendChatMessage = async (msg: Omit<ChatMessage, 'id'>) => {
    await addDoc(collection(db, 'chatMessages'), msg);
  };

  const getChatMessages = (consultId: string, cb: (msgs: ChatMessage[]) => void) => {
    return onSnapshot(
      query(collection(db, 'chatMessages'), orderBy('timestamp', 'asc')),
      (snap) => {
        const msgs = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
          .filter(m => m.consultId === consultId);
        cb(msgs);
      }
    );
  };

  return (
    <AppContext.Provider value={{
      cases, hospitals, doctors, consultRequests, currentRole, backendOnline, firestoreReady, setRole,
      submitCase, acceptCase, completeCase,
      registerHospital, registerDoctor, toggleDoctorAvailability, updateAmbulanceLocation,
      sendConsultRequest, respondToConsult, sendChatMessage, getChatMessages,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
