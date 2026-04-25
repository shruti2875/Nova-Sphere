import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'motion/react';
import { Building2, ShieldCheck, MapPin, AlertCircle, Bed } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Severity } from '../types';
import { cn } from '../lib/utils';

const SEV_COLOR: Record<Severity, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-600',
};
const SEV_TEXT: Record<Severity, string> = {
  low: 'text-green-700', medium: 'text-yellow-700', high: 'text-orange-700', critical: 'text-red-700',
};

function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function HospitalPage() {
  const { hospitals, cases, registerHospital } = useApp();
  const [name, setName] = useState('');
  const [beds, setBeds] = useState(10);
  const [icu, setIcu] = useState(false);
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const activeCases = cases.filter(c => c.status !== 'completed');
  const criticalCases = activeCases.filter(c => c.severity === 'critical');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || pickedLat === null) return;
    setLoading(true);
    try {
      await registerHospital({ name, lat: pickedLat, lng: pickedLng!, hasICU: icu, availableBeds: beds, totalBeds: beds + 20 });
      setName(''); setPickedLat(null); setPickedLng(null);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      <aside className="w-72 flex flex-col gap-3 overflow-y-auto shrink-0">
        <div className="card-base">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-600 rounded-xl shadow-lg shadow-red-100">
              <Building2 className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase">Facility Setup</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Register New Unit</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Hospital name" className="input-base w-full text-sm" required />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Available Beds</p>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 p-1">
                  <button type="button" onClick={() => setBeds(b => Math.max(0, b - 1))} className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-black text-slate-400 hover:text-red-600 transition-colors">-</button>
                  <span className="text-sm font-black text-slate-700">{beds}</span>
                  <button type="button" onClick={() => setBeds(b => b + 1)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 font-black text-slate-400 hover:text-green-600 transition-colors">+</button>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">ICU</p>
                <button type="button" onClick={() => setIcu(!icu)}
                  className={cn('w-full h-9 rounded-xl border font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1',
                    icu ? 'bg-indigo-900 border-indigo-900 text-white' : 'bg-white border-slate-200 text-slate-400')}>
                  {icu && <ShieldCheck size={11} />} {icu ? 'YES' : 'NO'}
                </button>
              </div>
            </div>
            <div className={cn('p-2.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-2',
              pickedLat ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400')}>
              <MapPin size={11} />
              {pickedLat ? `${pickedLat.toFixed(4)}, ${pickedLng?.toFixed(4)}` : 'Click map to pin location'}
            </div>
            <button type="submit" disabled={!pickedLat || !name || loading} className="btn-primary w-full text-sm">
              {loading ? 'Registering...' : 'REGISTER UNIT'}
            </button>
          </form>
        </div>

        <div className="card-base">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Network Stats</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase">Units</p>
              <p className="text-xl font-black text-slate-800">{hospitals.length}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase">Beds</p>
              <p className="text-xl font-black text-slate-800">{hospitals.reduce((a, h) => a + h.availableBeds, 0)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {hospitals.map(h => (
              <div key={h.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-[10px] font-black text-slate-700 truncate max-w-[110px]">{h.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Bed size={10} className="text-slate-400" />
                  <p className="text-[10px] font-black text-slate-400">{h.availableBeds}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
          <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapPicker onPick={(la, lo) => { setPickedLat(la); setPickedLng(lo); }} />
            {pickedLat && <Marker position={[pickedLat, pickedLng!]} />}
            {hospitals.map(h => (
              <Marker key={h.id} position={[h.lat, h.lng]}
                icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063201.png', iconSize: [26, 26] })} />
            ))}
            {activeCases.map(c => (
              <Marker key={c.id} position={[c.lat, c.lng]}
                icon={L.icon({
                  iconUrl: c.severity === 'critical' ? 'https://cdn-icons-png.flaticon.com/512/564/564619.png' : 'https://cdn-icons-png.flaticon.com/512/1033/1033010.png',
                  iconSize: [26, 26],
                })} />
            ))}
          </MapContainer>
          <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-700 uppercase">Satellite Sync Active</span>
          </div>
          {criticalCases.length > 0 && (
            <div className="absolute top-3 right-3 z-10 bg-red-600 text-white px-3 py-1.5 rounded-full shadow flex items-center gap-1.5 animate-emergency">
              <AlertCircle size={12} />
              <span className="text-[10px] font-black uppercase">{criticalCases.length} Critical</span>
            </div>
          )}
        </div>

        <div className="h-44 card-base flex flex-col overflow-hidden shrink-0">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Incoming Casualty Feed</h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {activeCases.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-30">
                <ShieldCheck size={28} className="mb-2" />
                <p className="text-[9px] font-black uppercase tracking-widest">No Incoming Cases</p>
              </div>
            )}
            {activeCases.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0', SEV_COLOR[c.severity])}>
                    <AlertCircle size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase">{c.patientName}</p>
                    <p className={cn('text-[9px] font-bold uppercase', SEV_TEXT[c.severity])}>{c.severity} • {c.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-red-600">ETA ~5min</p>
                  <p className="text-[9px] text-slate-400 font-bold">{c.assignedAmbulance || 'Unassigned'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
