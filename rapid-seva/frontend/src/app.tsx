import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, MessageSquare, X, Bot, AlertCircle, Wifi, WifiOff, Database, DatabaseZap } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { cn } from './lib/utils';
import { EmergencyCase } from './types';

import RoleSelect from './pages/RoleSelect';
import PatientPage from './pages/PatientPage';
import AmbulancePage from './pages/AmbulancePage';
import HospitalPage from './pages/HospitalPage';
import DoctorPage from './pages/DoctorPage';
import AIPanel from './components/AIPanel';

function CriticalAlertBanner({ alert, onDismiss }: { alert: EmergencyCase; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
    >
      <div className="bg-red-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-400 animate-emergency">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0 animate-pulse">
          <AlertCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase opacity-75 tracking-widest mb-0.5">🚨 Critical Emergency Detected</p>
          <p className="font-bold text-sm truncate">{alert.description}</p>
          <p className="text-[10px] opacity-60 mt-0.5">{alert.patientName} · {alert.lat.toFixed(3)}, {alert.lng.toFixed(3)}</p>
        </div>
        <button onClick={onDismiss} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function PermissionBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 shrink-0"
    >
      <AlertCircle size={14} className="text-amber-600 shrink-0" />
      <p className="text-xs font-bold text-amber-800 flex-1">
        Firestore permission denied. Go to{' '}
        <a href="https://console.firebase.google.com/project/rapid-seva-6b9cc/firestore/rules" target="_blank" rel="noreferrer" className="underline">
          Firebase Console → Firestore → Rules
        </a>
        {' '}and set: <code className="bg-amber-100 px-1 rounded">allow read, write: if true;</code>
      </p>
      <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800 shrink-0">
        <X size={14} />
      </button>
    </motion.div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { currentRole, setRole, backendOnline, firestoreReady, cases } = useApp();
  const [showAI, setShowAI] = useState(false);
  const [activeAlert, setActiveAlert] = useState<EmergencyCase | null>(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // Show permission banner after 3s if Firestore still not ready
  useEffect(() => {
    const t = setTimeout(() => {
      if (!firestoreReady) setShowPermissionBanner(true);
    }, 3000);
    return () => clearTimeout(t);
  }, [firestoreReady]);

  // Hide banner once Firestore connects
  useEffect(() => {
    if (firestoreReady) setShowPermissionBanner(false);
  }, [firestoreReady]);

  // Alert sound + banner on critical cases
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    const handleAlert = (e: Event) => {
      const c = (e as CustomEvent).detail as EmergencyCase;
      setActiveAlert(c);
      setTimeout(() => setActiveAlert(null), 7000);

      // Web Audio beep
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playBeep = (freq: number, start: number, duration: number) => {
          const osc = audioCtx!.createOscillator();
          const gain = audioCtx!.createGain();
          osc.connect(gain);
          gain.connect(audioCtx!.destination);
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.25, audioCtx!.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx!.currentTime + start + duration);
          osc.start(audioCtx!.currentTime + start);
          osc.stop(audioCtx!.currentTime + start + duration);
        };
        playBeep(880, 0, 0.15);
        playBeep(660, 0.2, 0.15);
        playBeep(880, 0.4, 0.3);
      } catch { /* audio blocked by browser policy */ }
    };

    window.addEventListener('emergency-alert', handleAlert);
    return () => window.removeEventListener('emergency-alert', handleAlert);
  }, []);

  const navLinks = [
    { role: 'PATIENT' as const,   path: '/patient',   label: 'PATIENT' },
    { role: 'AMBULANCE' as const, path: '/ambulance', label: 'AMBULANCE' },
    { role: 'HOSPITAL' as const,  path: '/hospital',  label: 'HOSPITAL' },
    { role: 'DOCTOR' as const,    path: '/doctor',    label: 'DOCTOR' },
  ];

  const pendingCount = cases.filter(c => c.status === 'pending').length;

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Permission error banner */}
      {showPermissionBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 shrink-0 z-50">
          <AlertCircle size={13} className="text-amber-600 shrink-0" />
          <p className="text-[11px] font-bold text-amber-800 flex-1">
            Firestore permission denied — open{' '}
            <a
              href="https://console.firebase.google.com/project/rapid-seva-6b9cc/firestore/rules"
              target="_blank" rel="noreferrer"
              className="underline font-black"
            >
              Firebase Console → Firestore → Rules
            </a>
            {' '}and paste: <code className="bg-amber-100 px-1 rounded text-amber-900">allow read, write: if true;</code>
          </p>
          <button onClick={() => setShowPermissionBanner(false)} className="text-amber-500 hover:text-amber-700 shrink-0 ml-2">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm z-40">
        <Link to="/" onClick={() => setRole(null)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="bg-red-600 p-1.5 rounded-lg shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-black tracking-tight">
            RAPID <span className="text-red-600">SEVA</span>
          </span>
        </Link>

        <nav className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
          {navLinks.map(({ role, path, label }) => (
            <Link
              key={role}
              to={path}
              onClick={() => setRole(role)}
              className={cn(
                'relative px-3 py-1 rounded-full text-[10px] font-black transition-all',
                currentRole === role
                  ? 'bg-white shadow-sm text-red-600 border border-slate-200'
                  : 'text-slate-500 hover:bg-white/50'
              )}
            >
              {label}
              {/* Live badge on AMBULANCE when pending cases exist */}
              {role === 'AMBULANCE' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Firestore status */}
          <div className="hidden sm:flex items-center gap-1.5">
            {firestoreReady ? (
              <><DatabaseZap size={12} className="text-green-500" /><span className="text-[10px] font-bold text-green-600">DB Live</span></>
            ) : (
              <><Database size={12} className="text-amber-400 animate-pulse" /><span className="text-[10px] font-bold text-amber-500">Connecting</span></>
            )}
          </div>

          <div className="w-px h-4 bg-slate-200 hidden sm:block" />

          {/* Flask AI status */}
          <div className="hidden sm:flex items-center gap-1.5">
            {backendOnline ? (
              <><Wifi size={12} className="text-green-500" /><span className="text-[10px] font-bold text-green-600">AI Online</span></>
            ) : (
              <><WifiOff size={12} className="text-slate-400" /><span className="text-[10px] font-bold text-slate-400">AI Offline</span></>
            )}
          </div>

          {/* Live pulse */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>

          {/* AI Chat button */}
          <button
            onClick={() => setShowAI(!showAI)}
            className={cn(
              'w-9 h-9 rounded-full border flex items-center justify-center transition-all',
              showAI
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
            )}
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden p-3">
        {children}
      </main>

      {/* AI Drawer */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 z-[60] shadow-2xl border-l border-slate-200 bg-white flex flex-col"
          >
            <div className="p-4 border-b flex items-center justify-between bg-indigo-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-indigo-300" />
                <div>
                  <p className="font-bold text-sm leading-none">AI Seva Assistant</p>
                  <p className="text-[10px] text-indigo-400 mt-0.5">Medical guidance · First aid · Emergency advice</p>
                </div>
              </div>
              <button onClick={() => setShowAI(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Critical alert banner */}
      <AnimatePresence>
        {activeAlert && (
          <CriticalAlertBanner alert={activeAlert} onDismiss={() => setActiveAlert(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<RoleSelect />} />
            <Route path="/patient" element={<PatientPage />} />
            <Route path="/ambulance" element={<AmbulancePage />} />
            <Route path="/hospital" element={<HospitalPage />} />
            <Route path="/doctor" element={<DoctorPage />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}
