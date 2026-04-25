import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'motion/react';
import { Stethoscope, Power, MapPin, UserRound, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Severity } from '../types';
import { cn } from '../lib/utils';

const SEV_COLOR: Record<Severity, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-600',
};

function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function DoctorPage() {
  const { doctors, cases, registerDoctor, toggleDoctorAvailability } = useApp();
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [phone, setPhone] = useState('');
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const activeCases = cases.filter(c => c.status !== 'completed');
  const criticalCases = activeCases.filter(c => c.severity === 'critical');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !spec.trim()) { setError('Name and specialization are required.'); return; }
    if (pickedLat === null || pickedLng === null) { setError('Please click the map to set your location.'); return; }
    setLoading(true);
    try {
      await registerDoctor({ name: name.trim(), specialization: spec.trim(), phone: phone.trim(), lat: pickedLat, lng: pickedLng, isAvailable: true });
      setName(''); setSpec(''); setPhone(''); setPickedLat(null); setPickedLng(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to join network. Check your connection.');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      <aside className="w-72 flex flex-col gap-3 overflow-y-auto shrink-0">
        <div className="card-base">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-600 rounded-xl shadow-lg shadow-red-100">
              <Stethoscope className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase">Pro Portal</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Register as Doctor</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Full Name" className="input-base w-full text-sm" />
            <input value={spec} onChange={e => setSpec(e.target.value)} placeholder="Specialization (e.g. Cardiologist)" className="input-base w-full text-sm" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (for alerts)" className="input-base w-full text-sm" />
            <div className={cn('p-2.5 rounded-xl border text-[10px] font-black uppercase flex items-center gap-2',
              pickedLat ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400')}>
              <MapPin size={11} />
              {pickedLat ? `${pickedLat.toFixed(4)}, ${pickedLng?.toFixed(4)}` : 'Click map to set location'}
            </div>
            {error && <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-2.5 py-2">{error}</p>}
            {success && <p className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-xl px-2.5 py-2">✓ Joined network successfully!</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
              {loading ? 'Joining...' : 'JOIN NETWORK'}
            </button>
          </form>
        </div>

        <div className="card-base flex-1 overflow-hidden flex flex-col min-h-0">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Active Responders ({doctors.filter(d => d.isAvailable).length}/{doctors.length})
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2">
            {doctors.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No doctors registered</p>}
            {doctors.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
                    <UserRound className="text-slate-400 w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-800 uppercase truncate">{d.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{d.specialization}</p>
                  </div>
                </div>
                <button onClick={() => toggleDoctorAvailability(d.id, !d.isAvailable)}
                  className={cn('p-2 rounded-lg transition-all shadow-sm shrink-0',
                    d.isAvailable ? 'bg-green-500 text-white shadow-green-100' : 'bg-slate-200 text-slate-400')}>
                  <Power size={13} />
                </button>
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
            {doctors.map(d => (
              <Marker key={d.id} position={[d.lat, d.lng]}
                icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2813/2813083.png', iconSize: [26, 26] })} />
            ))}
          </MapContainer>
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow border border-slate-700 text-white">
            <p className="text-[9px] font-black text-slate-500 uppercase">Dispatch Protocol</p>
            <p className="text-xs font-black text-red-400">VOICE-ONLY ENABLED</p>
          </div>
        </div>

        <div className="h-44 card-base bg-slate-900 border-slate-800 text-white flex flex-col overflow-hidden shrink-0">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nearby Emergency Feed</h3>
            {criticalCases.length > 0 && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {activeCases.length === 0 && (
              <div className="flex items-center justify-center h-full opacity-20">
                <p className="text-[9px] font-black uppercase tracking-widest">Listening for signals...</p>
              </div>
            )}
            {activeCases.map(c => (
              <div key={c.id} className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', SEV_COLOR[c.severity])} />
                  <div>
                    <p className="text-[10px] font-black text-white uppercase">{c.patientName}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase capitalize">{c.severity} • {c.description.slice(0, 30)}...</p>
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-white text-slate-900 rounded-lg text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">
                  VIEW
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
