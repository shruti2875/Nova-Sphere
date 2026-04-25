import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, ShieldAlert, CheckCircle, Navigation } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmergencyCase, Severity } from '../types';
import { cn } from '../lib/utils';

const SEV_COLOR: Record<Severity, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-600',
};
const SEV_TEXT: Record<Severity, string> = {
  low: 'text-green-700', medium: 'text-yellow-700', high: 'text-orange-700', critical: 'text-red-700',
};
const SEV_BG: Record<Severity, string> = {
  low: 'bg-green-50', medium: 'bg-yellow-50', high: 'bg-orange-50', critical: 'bg-red-50',
};

function CaseCard({ c, onAccept, onComplete }: { c: EmergencyCase; onAccept: () => void; onComplete: () => void; key?: string }) {
  const isNew = c.status === 'pending';
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={cn('relative p-4 rounded-2xl border transition-all', isNew ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-blue-50 border-blue-100')}
    >
      <div className={cn('absolute left-0 top-3 bottom-3 w-1 rounded-r-full', SEV_COLOR[c.severity])} />
      <div className="pl-3">
        <div className="flex justify-between items-start mb-2">
          <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded', SEV_BG[c.severity], SEV_TEXT[c.severity])}>
            {c.severity}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm font-black text-slate-800 mb-0.5">{c.patientName}</p>
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{c.description}</p>
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-3">
          <MapPin size={10} className="text-red-500" />
          {c.lat.toFixed(3)}, {c.lng.toFixed(3)}
        </div>
        {c.status === 'pending' && (
          <button onClick={onAccept} className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors">
            ACCEPT DISPATCH
          </button>
        )}
        {c.status === 'assigned' && (
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1">
              <Navigation size={11} /> NAVIGATE
            </button>
            <button onClick={onComplete} className="py-2 px-3 bg-green-100 text-green-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1">
              <CheckCircle size={11} /> DONE
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AmbulancePage() {
  const { cases, acceptCase, completeCase } = useApp();
  const [tab, setTab] = useState<'pending' | 'assigned'>('pending');

  const pending = cases.filter(c => c.status === 'pending');
  const assigned = cases.filter(c => c.status === 'assigned');
  const active = cases.filter(c => c.status !== 'completed');

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      <aside className="w-88 flex flex-col gap-3 shrink-0" style={{ width: '22rem' }}>
        <div className="card-base flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="font-black text-slate-800 text-sm uppercase">Mission Control</h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['pending', 'assigned'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn('px-3 py-1 rounded-md text-[10px] font-black transition-all',
                    tab === t ? 'bg-white shadow-sm text-red-600' : 'text-slate-500')}>
                  {t.toUpperCase()} ({t === 'pending' ? pending.length : assigned.length})
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <AnimatePresence mode="popLayout">
              {(tab === 'pending' ? pending : assigned).map(c => (
                <CaseCard
                  key={c.id}
                  c={c}
                  onAccept={() => acceptCase(c.id, 'AMB-001')}
                  onComplete={() => completeCase(c.id)}
                />
              ))}
            </AnimatePresence>
            {(tab === 'pending' ? pending : assigned).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 opacity-30">
                <ShieldAlert size={40} className="mb-3" />
                <p className="text-xs font-black uppercase tracking-widest">No Active Dispatches</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
          <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {active.map(c => (
              <Marker key={c.id} position={[c.lat, c.lng]}
                icon={L.icon({
                  iconUrl: c.severity === 'critical'
                    ? 'https://cdn-icons-png.flaticon.com/512/564/564619.png'
                    : 'https://cdn-icons-png.flaticon.com/512/1033/1033010.png',
                  iconSize: [32, 32],
                })}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-xs">{c.patientName}</p>
                    <p className="text-[10px] opacity-70 capitalize">{c.severity} • {c.status}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="absolute bottom-4 left-4 z-10 flex gap-2">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase">Unit Status</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-xs font-black text-slate-800">AMB-001 ACTIVE</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-16 bg-white rounded-2xl flex items-center px-6 gap-8 border border-slate-200 shadow-sm shrink-0">
          {[
            { label: 'Pending', value: pending.length, color: 'text-red-600' },
            { label: 'Assigned', value: assigned.length, color: 'text-blue-600' },
            { label: 'Avg Response', value: '7.2 min', color: 'text-slate-800' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
              <p className={cn('text-sm font-black', color)}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
