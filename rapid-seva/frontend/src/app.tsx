/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, MessageSquare, X, Activity, AlertCircle, Heart, User, MapPin, Truck, Hospital, UserRound } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { cn } from './lib/utils';

// Pages
import RoleSelect from './pages/RoleSelect';
import PatientPage from './pages/PatientPage';
import AmbulancePage from './pages/AmbulancePage';
import HospitalPage from './pages/HospitalPage';
import DoctorPage from './pages/DoctorPage';
import AIPanel from './components/AIPanel';

function Layout({ children }: { children: React.ReactNode }) {
  const { currentRole, setRole } = useApp();
  const [showAI, setShowAI] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, message: string, severity: string}[]>([]);

  useEffect(() => {
    const handleAlert = (e: any) => {
      const newCase = e.detail;
      const id = Math.random().toString();
      setNotifications(prev => [...prev, {
        id,
        message: `New Critical Case Detected!`,
        severity: 'CRITICAL'
      }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };

    window.addEventListener('emergency-alert', handleAlert);
    return () => window.removeEventListener('emergency-alert', handleAlert);
  }, []);

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-3">
          <Link to="/" onClick={() => setRole(null)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-red-600 p-2 rounded-lg shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">RAPID SEVA <span className="text-red-600 uppercase">Emergency</span></h1>
          </Link>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
          <Link to="/patient" onClick={() => setRole('PATIENT')} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black transition-all", currentRole === 'PATIENT' ? "bg-white shadow-sm text-red-600 border border-slate-200" : "text-slate-500 hover:bg-white/50")}>PATIENT</Link>
          <Link to="/ambulance" onClick={() => setRole('AMBULANCE')} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black transition-all", currentRole === 'AMBULANCE' ? "bg-white shadow-sm text-red-600 border border-slate-200" : "text-slate-500 hover:bg-white/50")}>AMBULANCE</Link>
          <Link to="/hospital" onClick={() => setRole('HOSPITAL')} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black transition-all", currentRole === 'HOSPITAL' ? "bg-white shadow-sm text-red-600 border border-slate-200" : "text-slate-500 hover:bg-white/50")}>HOSPITAL</Link>
          <Link to="/doctor" onClick={() => setRole('DOCTOR')} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black transition-all", currentRole === 'DOCTOR' ? "bg-white shadow-sm text-red-600 border border-slate-200" : "text-slate-500 hover:bg-white/50")}>DOCTOR</Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Network Live</span>
          </div>
          <button 
            onClick={() => setShowAI(!showAI)}
            className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all shadow-sm"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 relative">
        <AnimatePresence mode="wait">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </AnimatePresence>

        {/* Global Notification */}
        <AnimatePresence>
          {notifications.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
            >
              <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-red-500">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase opacity-80">Critical Alert</p>
                  <p className="font-bold text-sm">{notifications[0].message}</p>
                </div>
                <button className="bg-white text-red-600 px-4 py-1.5 rounded-lg font-black text-[10px] uppercase shadow-sm">Respond</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AI Panel Drawer */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 glass-panel shadow-2xl z-[60] border-l border-slate-200 bg-white"
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b flex items-center justify-between bg-indigo-900 text-white">
                <div className="flex items-center gap-2">
                  <Bot size={20} className="text-indigo-300" />
                  <span className="font-bold tracking-tight">AI Seva Assistant</span>
                </div>
                <button onClick={() => setShowAI(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AIPanel />
              </div>
            </div>
          </motion.div>
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
