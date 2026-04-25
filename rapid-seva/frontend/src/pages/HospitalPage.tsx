import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { Hospital as HospitalIcon, Bed, Plus, ShieldCheck, MapPin, AlertCircle, ShieldAlert, ArrowRight, TrendingUp } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Location } from '../types';
import { cn } from '../lib/utils';

export default function HospitalPage() {
  const { hospitals, registerHospital, cases } = useApp();
  const [name, setName] = useState('');
  const [beds, setBeds] = useState(10);
  const [icu, setIcu] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);

  const activeCases = cases.filter(c => c.status !== 'COMPLETED');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;
    registerHospital({
      name,
      availableBeds: beds,
      totalBeds: beds + 20,
      hasICU: icu,
      location
    });
    setName('');
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
      {/* Sidebar: Control Panel */}
      <aside className="w-80 flex flex-col gap-4 overflow-y-auto">
        <div className="card-base">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-100">
              <HospitalIcon className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">FACILITY SETUP</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Register New Unit</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Facility Name</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Hospital Name..."
                className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-xs font-bold transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Beds</p>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 p-1">
                  <button type="button" onClick={() => setBeds(Math.max(0, beds - 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 hover:text-red-600 transition-colors">-</button>
                  <span className="text-sm font-black text-slate-700">{beds}</span>
                  <button type="button" onClick={() => setBeds(beds + 1)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 hover:text-green-600 transition-colors">+</button>
                </div>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ICU</p>
                <button 
                  type="button" 
                  onClick={() => setIcu(!icu)}
                  className={cn(
                    "flex-1 rounded-xl border font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2",
                    icu ? "bg-indigo-900 border-indigo-900 text-white shadow-lg" : "bg-white border-slate-200 text-slate-400"
                  )}
                >
                   {icu ? <ShieldCheck size={12} /> : null} {icu ? 'YES' : 'NO'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 flex items-center gap-2 text-[10px] font-black uppercase tracking-tight">
              <MapPin size={12} />
              {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Click map to pin'}
            </div>

            <button
              type="submit"
              disabled={!location || !name}
              className="btn-primary w-full shadow-red-100"
            >
              REGISTER MISSION UNIT
            </button>
          </form>
        </div>

        <div className="card-base flex flex-col gap-4 overflow-hidden">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Analytics</h2>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                 <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Units</p>
                 <p className="text-xl font-black text-slate-800 tracking-tighter">{hospitals.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                 <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Beds</p>
                 <p className="text-xl font-black text-slate-800 tracking-tighter">{hospitals.reduce((acc, h) => acc + h.availableBeds, 0)}</p>
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {hospitals.map(h => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[100px]">{h.name}</p>
                   </div>
                   <p className="text-[10px] font-black text-slate-400">{h.availableBeds} BEDS</p>
                </div>
              ))}
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative bg-slate-200">
          <MapContainer center={[18.5204, 73.8567]} zoom={13} style={{ height: '100%', width: '100%' }} className="z-0">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapPicker />
            {hospitals.map(h => (
              <Marker key={h.id} position={[h.location.lat, h.location.lng]} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063201.png', iconSize: [24, 24] })} />
            ))}
          </MapContainer>
          <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-slate-200 flex items-center gap-2">
             <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Satellite Sync: High</p>
          </div>
        </div>

        <div className="h-48 bg-white card-base flex flex-col overflow-hidden">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">INCOMING CASUALTY FEED</h2>
           <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {activeCases.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                        c.severity === 'CRITICAL' ? "bg-red-600" : "bg-orange-500"
                      )}>
                        <AlertCircle size={16} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">{c.patientName}</p>
                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{c.severity} EMERGENCY</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-red-600 uppercase">ETA 4:20M</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">UNIT AMB-12</p>
                   </div>
                </div>
              ))}
              {activeCases.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50">
                   <ShieldCheck size={32} className="mb-2" />
                   <p className="text-[8px] font-black uppercase tracking-widest text-center">No Incoming Threats</p>
                </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
}
