import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Power, MapPin, UserRound, CheckCircle, XCircle, MessageSquare, Navigation, X, AlertTriangle, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmergencyCase, Severity } from '../types';
import { cn } from '../lib/utils';
import ConsultChat from '../components/ConsultChat';

const SEV_COLOR: Record<Severity, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-600',
};
const SEV_TEXT: Record<Severity, string> = {
  low: 'text-green-700', medium: 'text-yellow-700', high: 'text-orange-700', critical: 'text-red-700',
};
const SEV_BG: Record<Severity, string> = {
  low: 'bg-green-50 border-green-200', medium: 'bg-yellow-50 border-yellow-200',
  high: 'bg-orange-50 border-orange-200', critical: 'bg-red-50 border-red-200',
};
const SEV_LABEL: Record<Severity, string> = {
  low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL',
};

// Case marker icons
const CASE_ICON = (severity: Severity, selected: boolean) => {
  const colors: Record<Severity, string> = {
    low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#dc2626',
  };
  const size = selected ? 36 : 26;
  const color = colors[severity];
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
    (selected ? `<circle cx="20" cy="20" r="18" fill="${color}" opacity="0.25"/>` : '') +
    `<circle cx="20" cy="20" r="${selected ? 11 : 9}" fill="${color}" stroke="white" stroke-width="2.5"/>` +
    `<text x="20" y="25" text-anchor="middle" font-size="13" fill="white" font-weight="bold">!</text>` +
    `</svg>`
  );
  return L.icon({ iconUrl: `data:image/svg+xml,${svg}`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
};

function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapFlyTo({ selectedCase }: { selectedCase: EmergencyCase | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCase) map.flyTo([selectedCase.lat, selectedCase.lng], 15, { duration: 1.2 });
  }, [selectedCase?.id]);
  return null;
}

function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
  return (Math.sqrt((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2) * 111).toFixed(1);
}

export default function DoctorPage() {
  const { doctors, cases, registerDoctor, toggleDoctorAvailability, consultRequests, respondToConsult } = useApp();
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [phone, setPhone] = useState('');
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [responding, setResponding] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);
  const [acceptedCases, setAcceptedCases] = useState<Set<string>>(new Set());

  // Use first available doctor's location as reference for distance
  const refDoctor = doctors.find(d => d.isAvailable);
  const refLat = refDoctor?.lat ?? 18.5204;
  const refLng = refDoctor?.lng ?? 73.8567;

  const myRequests = consultRequests.filter(r => r.targetDoctorId === selectedDoctorId);
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  const handleRespond = async (consultId: string, status: 'accepted' | 'rejected') => {
    setResponding(consultId);
    try { await respondToConsult(consultId, status); }
    finally { setResponding(null); }
  };

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

        {/* Consult Inbox */}
        <div className="card-base">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={12} className="text-indigo-600" />
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Consult Inbox</h3>
            {pendingCount > 0 && (
              <span className="w-4 h-4 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-pulse ml-auto">
                {pendingCount}
              </span>
            )}
          </div>
          <select
            value={selectedDoctorId}
            onChange={e => { setSelectedDoctorId(e.target.value); setActiveChat(null); }}
            className="input-base w-full text-xs mb-3"
          >
            <option value="">— Select your profile —</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} · {d.specialization}</option>
            ))}
          </select>
          {selectedDoctorId && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {myRequests.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No requests yet</p>
              )}
              {myRequests.map(req => (
                <div key={req.id} className={cn(
                  'p-2.5 rounded-xl border',
                  req.status === 'accepted' ? 'bg-green-50 border-green-200' :
                  req.status === 'rejected' ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                )}>
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-slate-800 truncate">{req.patientName}</p>
                    <span className={cn(
                      'text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0',
                      req.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    )}>{req.status}</span>
                  </div>
                  <p className="text-[9px] text-slate-500 line-clamp-2 mb-2">{req.problem}</p>
                  {req.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleRespond(req.id, 'accepted')}
                        disabled={responding === req.id}
                        className="flex-1 flex items-center justify-center gap-1 py-1 bg-green-600 text-white rounded text-[8px] font-black uppercase disabled:opacity-50"
                      >
                        <CheckCircle size={9} /> Accept
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, 'rejected')}
                        disabled={responding === req.id}
                        className="flex-1 flex items-center justify-center gap-1 py-1 bg-red-500 text-white rounded text-[8px] font-black uppercase disabled:opacity-50"
                      >
                        <XCircle size={9} /> Reject
                      </button>
                    </div>
                  )}
                  {req.status === 'accepted' && (
                    <button
                      onClick={() => setActiveChat(req.id)}
                      className="w-full flex items-center justify-center gap-1 py-1 bg-indigo-600 text-white rounded text-[8px] font-black uppercase"
                    >
                      <MessageSquare size={9} /> Open Chat
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
          <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapPicker onPick={(la, lo) => { setPickedLat(la); setPickedLng(lo); }} />
            <MapFlyTo selectedCase={selectedCase} />
            {pickedLat && <Marker position={[pickedLat, pickedLng!]} />}
            {/* Doctor markers */}
            {doctors.map(d => (
              <Marker key={d.id} position={[d.lat, d.lng]}
                icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2813/2813083.png', iconSize: [26, 26] })} />
            ))}
            {/* Case markers */}
            {activeCases.map(c => (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={CASE_ICON(c.severity, selectedCase?.id === c.id)}
                eventHandlers={{ click: () => setSelectedCase(c) }}
              />
            ))}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow border border-slate-700 text-white">
            <p className="text-[9px] font-black text-slate-500 uppercase">Dispatch Protocol</p>
            <p className="text-xs font-black text-red-400">VOICE-ONLY ENABLED</p>
          </div>

          {/* Floating case details panel */}
          <AnimatePresence>
            {selectedCase && (
              <motion.div
                key={selectedCase.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.22 }}
                className="absolute bottom-4 right-4 z-20 w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              >
                {/* Header */}
                <div className={cn('px-4 py-3 flex items-center justify-between border-b', SEV_BG[selectedCase.severity])}>
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', SEV_COLOR[selectedCase.severity],
                      selectedCase.severity === 'critical' ? 'animate-pulse' : '')} />
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', SEV_TEXT[selectedCase.severity])}>
                      {SEV_LABEL[selectedCase.severity]} EMERGENCY
                    </span>
                  </div>
                  <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Body */}
                <div className="px-4 py-3 space-y-3">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Patient</p>
                    <p className="text-sm font-black text-slate-800">{selectedCase.patientName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Description</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedCase.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                      <p className="text-[10px] font-black text-slate-700 capitalize mt-0.5">{selectedCase.status}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Score</p>
                      <p className="text-[10px] font-black text-slate-700 mt-0.5">{selectedCase.survivalScore}%</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Dist</p>
                      <p className="text-[10px] font-black text-slate-700 mt-0.5">{dist(refLat, refLng, selectedCase.lat, selectedCase.lng)}km</p>
                    </div>
                  </div>

                  {selectedCase.isCardiac && (
                    <div className="flex items-center gap-2 px-2.5 py-2 bg-red-50 border border-red-100 rounded-xl">
                      <Activity size={12} className="text-red-600 animate-pulse shrink-0" />
                      <span className="text-[10px] font-black text-red-700">Cardiac Emergency — AI Flagged</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setAcceptedCases(prev => new Set(prev).add(selectedCase.id));
                      }}
                      disabled={acceptedCases.has(selectedCase.id)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase transition-all',
                        acceptedCases.has(selectedCase.id)
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      )}
                    >
                      <CheckCircle size={11} />
                      {acceptedCases.has(selectedCase.id) ? 'Accepted' : 'Accept Case'}
                    </button>
                    <button
                      onClick={() => console.log('Navigate to', selectedCase.lat, selectedCase.lng)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all"
                    >
                      <Navigation size={11} /> Navigate
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <div key={c.id} className={cn(
                'p-2.5 rounded-xl border border-white/5 flex items-center justify-between transition-colors cursor-pointer',
                selectedCase?.id === c.id ? 'bg-white/15 border-white/20' : 'bg-white/5 hover:bg-white/10'
              )}>
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', SEV_COLOR[c.severity],
                    c.severity === 'critical' ? 'animate-pulse' : '')} />
                  <div>
                    <p className="text-[10px] font-black text-white uppercase">{c.patientName}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase capitalize">{c.severity} • {c.description.slice(0, 30)}...</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCase(selectedCase?.id === c.id ? null : c)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all shrink-0',
                    selectedCase?.id === c.id
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-slate-900 hover:bg-red-500 hover:text-white'
                  )}
                >
                  {selectedCase?.id === c.id ? 'CLOSE' : 'VIEW'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Chat Modal */}
      {activeChat && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setActiveChat(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md h-[500px] overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <ConsultChat consultId={activeChat} sender="doctor" onClose={() => setActiveChat(null)} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
