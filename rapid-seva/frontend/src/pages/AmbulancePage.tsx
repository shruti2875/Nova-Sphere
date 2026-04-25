import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, MapPin, Clock, CheckCircle, Navigation, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default function AmbulancePage() {
  const { cases, acceptCase, updateCaseStatus, fetchCases } = useApp();

  useEffect(() => { fetchCases(); }, []);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACCEPTED'>('PENDING');

  const pendingCases = cases.filter(c => c.status === 'PENDING');
  const acceptedCases = cases.filter(c => c.status === 'ACCEPTED');

  const handleAccept = (caseId: string) => {
    acceptCase(caseId, 'AMB-001');
    setActiveTab('ACCEPTED');
  };

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* List Sidebar */}
      <aside className="w-96 flex flex-col gap-4">
        <div className="card-base flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800 uppercase tracking-tight">MISSION CONTROL</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setActiveTab('PENDING')}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-black transition-all",
                  activeTab === 'PENDING' ? "bg-white shadow-sm text-red-600" : "text-slate-500"
                )}
              >
                PENDING ({pendingCases.length})
              </button>
              <button 
                onClick={() => setActiveTab('ACCEPTED')}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-black transition-all",
                  activeTab === 'ACCEPTED' ? "bg-white shadow-sm text-blue-600" : "text-slate-500"
                )}
              >
                ACTIVE ({acceptedCases.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <AnimatePresence mode="popLayout">
              {(activeTab === 'PENDING' ? pendingCases : acceptedCases).map(c => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-10 rounded-full absolute left-0 top-1/2 -translate-y-1/2",
                        c.severity === 'CRITICAL' ? "bg-red-600" : "bg-orange-500"
                      )}></div>
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest pl-2">{c.severity}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-black text-slate-800 mb-1">{c.patientName}</h3>
                  <p className="text-xs text-slate-500 leading-tight mb-4 line-clamp-2">{c.description}</p>
                  
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-4">
                    <MapPin size={10} className="text-red-500" />
                    Sector 4 • 2.4km
                  </div>

                  {c.status === 'PENDING' && (
                    <button 
                      onClick={() => handleAccept(c.id)}
                      className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-slate-200 group-hover:scale-[1.02]"
                    >
                      ACCEPT DISPATCH
                    </button>
                  )}

                  {c.status === 'ACCEPTED' && (
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">NAVIGATE</button>
                      <button 
                        onClick={() => updateCaseStatus(c.id, 'COMPLETED')}
                        className="py-2 px-3 bg-green-100 text-green-700 rounded-xl text-[10px] font-black uppercase"
                      >
                         DONE
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {(activeTab === 'PENDING' ? pendingCases : acceptedCases).length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center opacity-30">
                <ShieldAlert size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">No Active Dispatches</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Map */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 card-base overflow-hidden relative p-0 bg-slate-200 border border-slate-200">
           <MapContainer 
            center={[18.5204, 73.8567]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {cases.filter(c => c.status !== 'COMPLETED').map(c => (
              <Marker 
                key={c.id} 
                position={[c.location.lat, c.location.lng]}
                icon={L.icon({ 
                  iconUrl: c.severity === 'CRITICAL' ? 'https://cdn-icons-png.flaticon.com/512/564/564619.png' : 'https://cdn-icons-png.flaticon.com/512/1033/1033010.png', 
                  iconSize: [32, 32] 
                })}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-xs">{c.patientName}</p>
                    <p className="text-[10px] opacity-70">{c.severity} Emergency</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="absolute bottom-6 left-6 z-10 flex gap-3">
             <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Status</p>
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-200"></div>
                   <p className="text-sm font-black text-slate-800">AMB-702 ACTIVE</p>
                </div>
             </div>
             <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-700 text-white">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Session</p>
                <p className="text-sm font-black text-red-500">RES-OFF</p>
             </div>
          </div>
        </div>

        <div className="h-20 bg-white rounded-2xl flex items-center px-10 gap-10 shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-4">
             <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
                <Clock className="w-5 h-5" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Avg Response</p>
                <p className="text-sm font-black text-slate-800">7.2 MINS</p>
             </div>
          </div>
          <div className="w-[1px] h-8 bg-slate-100"></div>
          <div className="flex items-center gap-4">
             <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
                <MapPin className="w-5 h-5" />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Zone Score</p>
                <p className="text-sm font-black text-slate-800">ALPHA-9</p>
             </div>
          </div>
          <div className="w-[1px] h-8 bg-slate-100"></div>
          <div className="flex-1 flex justify-end">
             <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">+8</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
