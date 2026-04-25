import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { UserRound, Stethoscope, Power, MapPin, Users, AlertCircle, ShieldAlert } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Location } from '../types';
import { cn } from '../lib/utils';

export default function DoctorPage() {
  const { doctors, registerDoctor, updateDoctorAvailability, cases, fetchDoctors, fetchCases } = useApp();
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => { fetchDoctors(); fetchCases(); }, []);

  const activeCases = cases.filter(c => c.status !== 'COMPLETED');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;
    registerDoctor({
      name,
      specialization: spec,
      isAvailable: true,
      location
    });
    setName('');
    setSpec('');
    setLocation(null);
  };

  function MapPicker() {
    useMapEvents({
      click(e) {
        setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return location ? <Marker position={[location.lat, location.lng]} /> : null;
  }

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Role Management Sidebar */}
      <aside className="w-80 flex flex-col gap-4 overflow-y-auto">
        <div className="card-base">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-100">
              <Stethoscope className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">PRO PORTAL</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medical Credentials</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Identity</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Name..."
                className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-xs font-bold transition-all"
                required
              />
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Specialization</p>
              <input
                type="text"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="e.g. Cardiologist"
                className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-xs font-bold transition-all"
                required
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight">
              <MapPin size={12} />
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Set duty location on map'}
            </div>

            <button
              type="submit"
              disabled={!location}
              className="btn-primary w-full shadow-red-100"
            >
              AUTH & JOIN NETWORK
            </button>
          </form>
        </div>

        <div className="card-base flex-1 overflow-hidden flex flex-col">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">ACTIVE RESPONDERS</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {doctors.map(doctor => (
              <div key={doctor.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                    <UserRound className="text-slate-400 w-5 h-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase truncate">{doctor.name}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{doctor.specialization}</p>
                  </div>
                </div>
                <button 
                  onClick={() => updateDoctorAvailability(doctor.id, !doctor.isAvailable)}
                  className={cn(
                    "p-2 rounded-lg transition-all shadow-sm",
                    doctor.isAvailable ? "bg-green-500 text-white shadow-green-100" : "bg-slate-200 text-slate-400"
                  )}
                >
                  <Power size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Map & Alerts */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-200">
          <MapContainer center={[18.5204, 73.8567]} zoom={13} style={{ height: '100%', width: '100%' }} className="z-0">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapPicker />
            {doctors.map(d => (
              <Marker key={d.id} position={[d.location.lat, d.location.lng]} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2813/2813083.png', iconSize: [24, 24] })} />
            ))}
          </MapContainer>
          <div className="absolute bottom-6 left-6 z-10">
             <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-700 text-white">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dispatch Protocol</p>
                <p className="text-sm font-black text-red-500">VOICE-ONLY ENABLED</p>
             </div>
          </div>
        </div>

        <div className="h-40 card-base flex flex-col overflow-hidden bg-slate-900 border-slate-800 text-white shadow-2xl">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nearby Emergency Feed</h2>
             <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
             {activeCases.map(c => (
               <div key={c.id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    <div>
                       <p className="text-[10px] font-black text-white uppercase">{c.patientName}</p>
                       <p className="text-[8px] font-bold text-slate-500 uppercase">{c.severity} EMERGENCY</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-white text-slate-900 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm">VIEW BRIEF</button>
               </div>
             ))}
             {activeCases.length === 0 && (
               <div className="flex items-center justify-center h-full opacity-20">
                  <p className="text-[8px] font-black uppercase tracking-[0.4em]">Listening for local signals...</p>
               </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}
