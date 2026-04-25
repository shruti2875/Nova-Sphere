import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Send, Bot, Heart, Truck, Clock, Sparkles, Stethoscope, MessageSquare, Phone, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmergencyCase, Severity, Doctor, Hospital, ConsultRequest } from '../types';
import { cn } from '../lib/utils';
import ConsultChat from '../components/ConsultChat';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});

const SEV_STYLE: Record<Severity, { bg: string; text: string; border: string; bar: string; label: string }> = {
  low:      { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  bar: 'bg-green-500',  label: 'LOW' },
  medium:   { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', bar: 'bg-yellow-500', label: 'MEDIUM' },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', bar: 'bg-orange-500', label: 'HIGH' },
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    bar: 'bg-red-600',    label: 'CRITICAL' },
};

const STATUS_STEPS = ['pending', 'assigned', 'active', 'completed'] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: 'Waiting for ambulance...',
  assigned: '🚑 Ambulance dispatched!',
  active: '🏥 En route to hospital',
  completed: '✅ Case resolved',
};

// Keyword → specialization matching for teleconsult
const SPEC_KEYWORDS: Record<string, string[]> = {
  'Cardiologist':        ['heart', 'chest pain', 'cardiac', 'palpitation', 'blood pressure'],
  'Neurologist':         ['headache', 'migraine', 'stroke', 'seizure', 'numbness', 'dizziness'],
  'Orthopedic':          ['fracture', 'bone', 'joint', 'knee', 'back pain', 'sprain'],
  'Pediatrician':        ['child', 'baby', 'infant', 'fever child', 'kid'],
  'Dermatologist':       ['rash', 'skin', 'allergy', 'itch', 'burn'],
  'General Physician':   ['fever', 'cold', 'cough', 'fatigue', 'weakness', 'vomit'],
  'Gynecologist':        ['pregnancy', 'period', 'menstrual', 'ovary', 'uterus'],
  'Pulmonologist':       ['breathing', 'asthma', 'lung', 'cough blood', 'shortness'],
};

const HOSP_SPEC_KEYWORDS: Record<string, string[]> = {
  'Cardiac & Trauma':        ['heart', 'cardiac', 'chest', 'trauma', 'accident'],
  'Neurology & Stroke':      ['stroke', 'seizure', 'brain', 'neuro', 'headache'],
  'Burns & Plastic Surgery': ['burn', 'fire', 'skin graft'],
  'Pediatric Emergency':     ['child', 'baby', 'infant', 'kid'],
  'Orthopedic & Fractures':  ['fracture', 'bone', 'joint', 'sprain'],
  'Maternity & Obstetrics':  ['pregnancy', 'labor', 'delivery', 'maternity'],
  'General Emergency':       [],
  'Multi-Specialty':         [],
};

function matchDoctors(problem: string, doctors: Doctor[]): { doctor: Doctor; keywords: string[] }[] {
  const p = problem.toLowerCase();
  const scored = doctors
    .filter(d => d.isAvailable)
    .map(d => {
      const specKeys = SPEC_KEYWORDS[d.specialization] ?? [];
      const matched = specKeys.filter(k => p.includes(k));
      const score = matched.length || (d.specialization === 'General Physician' ? 0.5 : 0);
      return { doctor: d, keywords: matched, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(({ doctor, keywords }) => ({ doctor, keywords }));
}

function matchHospitals(problem: string, hospitals: Hospital[]): Hospital[] {
  const p = problem.toLowerCase();
  return hospitals
    .map(h => {
      const keys = HOSP_SPEC_KEYWORDS[h.specialization] ?? [];
      const score = keys.filter(k => p.includes(k)).length + (h.hasICU ? 0.5 : 0);
      return { h, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.h);
}

function MapClicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
function MapFly({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], map.getZoom()); }, [lat, lng]);
  return null;
}

export default function PatientPage() {
  const { submitCase, hospitals, doctors, cases, firestoreReady, consultRequests, sendConsultRequest } = useApp();
  const [lat, setLat] = useState(18.5204);
  const [lng, setLng] = useState(73.8567);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [eta, setEta] = useState(600);

  // Teleconsultation state
  const [consultProblem, setConsultProblem] = useState('');
  const [consultName, setConsultName] = useState('');
  const [matchedDoctors, setMatchedDoctors] = useState<{ doctor: Doctor; keywords: string[] }[]>([]);
  const [matchedHospitals, setMatchedHospitals] = useState<Hospital[]>([]);
  const [consultAnalyzed, setConsultAnalyzed] = useState(false);
  const [sendingConsult, setSendingConsult] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  // My sent consult requests
  const myConsultRequests = consultRequests.filter(r => r.patientName === consultName && consultName.trim() !== '');
  const acceptedConsult = myConsultRequests.find(r => r.status === 'accepted');

  // Live case — always reads from Firestore snapshot, no manual refresh needed
  const liveCase = submittedId ? cases.find(c => c.id === submittedId) ?? null : null;

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {
      setLat(p.coords.latitude);
      setLng(p.coords.longitude);
    });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!liveCase) return;
    const t = setInterval(() => setEta(e => Math.max(0, e - 1)), 1000);
    return () => clearInterval(t);
  }, [!!liveCase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !name.trim()) return;
    setLoading(true);
    try {
      const c = await submitCase(name, desc, lat, lng);
      setSubmittedId(c.id);
      setEta(600);
    } finally {
      setLoading(false);
    }
  };

  // Teleconsult handlers
  const handleConsultAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultProblem.trim() || !consultName.trim()) return;
    setMatchedDoctors(matchDoctors(consultProblem, doctors));
    setMatchedHospitals(matchHospitals(consultProblem, hospitals));
    setConsultAnalyzed(true);
  };

  const handleSendConsultRequest = async (doctor: Doctor, keywords: string[]) => {
    setSendingConsult(doctor.id);
    try {
      await sendConsultRequest({
        patientName: consultName.trim(),
        problem: consultProblem.trim(),
        matchedKeywords: keywords,
        targetDoctorId: doctor.id,
        targetDoctorName: doctor.name,
        status: 'pending',
        timestamp: Date.now(),
        patientLat: lat,
        patientLng: lng,
      });
    } finally {
      setSendingConsult(null);
    }
  };

  const getRequestForDoctor = (doctorId: string) =>
    myConsultRequests.find(r => r.targetDoctorId === doctorId) ?? null;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const dist = (la: number, lo: number) => Math.sqrt((lat - la) ** 2 + (lng - lo) ** 2) * 111;

  const bestHospital = liveCase
    ? [...hospitals].sort((a, b) => {
        if (a.hasICU && !b.hasICU) return -1;
        if (!a.hasICU && b.hasICU) return 1;
        return dist(a.lat, a.lng) - dist(b.lat, b.lng);
      })[0] ?? null
    : null;

  const sev = liveCase ? SEV_STYLE[liveCase.severity] : null;
  const stepIndex = liveCase ? STATUS_STEPS.indexOf(liveCase.status as any) : -1;

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      {/* Left sidebar */}
      <aside className="w-72 flex flex-col gap-3 overflow-y-auto shrink-0">
        <AnimatePresence mode="wait">
          {!liveCase ? (
            <motion.div key="form" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="card-base">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-black text-slate-800 text-sm uppercase">Request Help</h2>
                <span className="badge-critical bg-blue-100 text-blue-700">PATIENT</span>
              </div>

              {!firestoreReady && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-700 flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  Connecting to network...
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="input-base w-full text-sm"
                  required
                />
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-400">
                  <MapPin size={11} className="text-red-500 shrink-0" />
                  {lat.toFixed(4)}, {lng.toFixed(4)} — click map to change
                </div>
                <textarea
                  value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Describe the emergency (e.g. heart attack, accident, bleeding...)"
                  className="input-base w-full h-28 resize-none text-sm"
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI Analyzing...</>
                  ) : (
                    <><Send size={14} />REQUEST IMMEDIATE HELP</>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="status" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-base">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-black text-slate-800 text-sm uppercase">Active Case</h2>
                <span className={cn('px-2 py-0.5 rounded text-[10px] font-black uppercase border', sev?.bg, sev?.text, sev?.border)}>
                  {sev?.label}
                </span>
              </div>

              {liveCase.isCardiac && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-xl mb-3">
                  <Heart size={14} className="text-red-600 animate-pulse" />
                  <span className="text-xs font-bold text-red-700">Cardiac Emergency — AI Flagged</span>
                </div>
              )}

              {/* Live status tracker — updates automatically from Firestore */}
              <div className="mb-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Live Status</p>
                <div className="flex items-center gap-1 mb-2">
                  {STATUS_STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className={cn('w-2 h-2 rounded-full transition-all duration-500', i <= stepIndex ? 'bg-green-500 scale-125' : 'bg-slate-200')} />
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={cn('flex-1 h-0.5 transition-all duration-700', i < stepIndex ? 'bg-green-500' : 'bg-slate-200')} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <p className={cn('text-xs font-bold', liveCase.status === 'assigned' ? 'text-green-700' : 'text-slate-600')}>
                  {STATUS_LABEL[liveCase.status]}
                </p>
                {liveCase.assignedAmbulance && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Truck size={11} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600">{liveCase.assignedAmbulance}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Survival Score</p>
                  <p className="text-2xl font-black text-slate-800">{liveCase.survivalScore}<span className="text-sm text-green-500">%</span></p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">ETA</p>
                  <p className="text-xl font-black text-slate-800">{fmt(eta)}</p>
                </div>
              </div>

              <div className="mb-1 flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                <span>Survival Probability</span><span>{liveCase.survivalScore}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${liveCase.survivalScore}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', sev?.bar)}
                />
              </div>

              <button
                onClick={() => { setSubmittedId(null); setName(''); setDesc(''); }}
                className="mt-3 w-full py-2 border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-colors"
              >
                New Emergency
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nearby Doctors — live from Firestore */}
        <div className="card-base flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nearby Doctors</h3>
            <span className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
              {doctors.filter(d => d.isAvailable).length} available
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {doctors.filter(d => d.isAvailable).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No doctors available</p>
            )}
            {doctors.filter(d => d.isAvailable).map(d => (
              <div key={d.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-black shrink-0">Dr</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{d.name}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-bold">{d.specialization} • {dist(d.lat, d.lng).toFixed(1)}km</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Teleconsult Panel — always visible */}
        <div className="card-base">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope size={12} className="text-indigo-600" />
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Teleconsult</h3>
          </div>
          {!consultAnalyzed ? (
            <form onSubmit={handleConsultAnalyze} className="space-y-2">
              <input
                value={consultName}
                onChange={e => { setConsultName(e.target.value); setConsultAnalyzed(false); }}
                placeholder="Your name"
                className="input-base w-full text-xs"
              />
              <textarea
                value={consultProblem}
                onChange={e => { setConsultProblem(e.target.value); setConsultAnalyzed(false); }}
                placeholder="Describe your problem..."
                className="input-base w-full h-16 resize-none text-xs"
              />
              <button type="submit" className="btn-primary w-full text-xs flex items-center justify-center gap-1">
                <Sparkles size={12} /> Find Doctors
              </button>
            </form>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Matched Doctors</p>
              {matchedDoctors.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No matching doctors</p>
              )}
              {matchedDoctors.map(({ doctor, keywords }) => {
                const req = getRequestForDoctor(doctor.id);
                return (
                  <div key={doctor.id} className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-indigo-800 truncate">{doctor.name}</p>
                        <p className="text-[8px] font-bold text-indigo-600 uppercase">{doctor.specialization}</p>
                      </div>
                      {!req ? (
                        <button
                          onClick={() => handleSendConsultRequest(doctor, keywords)}
                          disabled={sendingConsult === doctor.id}
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-[8px] font-black uppercase shrink-0 disabled:opacity-50"
                        >
                          {sendingConsult === doctor.id ? '...' : 'Request'}
                        </button>
                      ) : req.status === 'pending' ? (
                        <span className="text-[8px] font-black text-amber-600">Pending...</span>
                      ) : req.status === 'accepted' ? (
                        <button
                          onClick={() => setActiveChat(req.id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-[8px] font-black uppercase flex items-center gap-1"
                        >
                          <MessageSquare size={8} /> Chat
                        </button>
                      ) : (
                        <span className="text-[8px] font-black text-red-600">Declined</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => setConsultAnalyzed(false)}
                className="text-[8px] font-bold text-slate-400 uppercase hover:text-slate-600"
              >
                ← Change problem
              </button>
            </div>
          )}
        </div>

        {/* Nearby Hospitals List */}
        <div className="card-base flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={12} className="text-red-500" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospitals</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {hospitals.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No hospitals registered</p>
            )}
            {hospitals.slice(0, 5).map(h => (
              <div key={h.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-slate-800 truncate flex-1">{h.name}</p>
                  {h.hasICU && (
                    <span className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded ml-1 shrink-0">ICU</span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 uppercase font-bold">{h.specialization}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[8px] font-bold text-slate-500">
                    {h.availableBeds} beds • {dist(h.lat, h.lng).toFixed(1)}km
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[8px] font-black uppercase hover:bg-green-700"
                  >
                    <Phone size={8} /> Contact
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor Inbox - Shows consult request status */}
        <div className="card-base flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor Inbox</h3>
            <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
              {myConsultRequests.length} request{myConsultRequests.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {myConsultRequests.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No consult requests yet</p>
            )}
            {myConsultRequests.map(req => (
              <div key={req.id} className={cn(
                'p-2.5 rounded-xl border',
                req.status === 'accepted' ? 'bg-green-50 border-green-200' :
                req.status === 'rejected' ? 'bg-red-50 border-red-200' :
                'bg-amber-50 border-amber-200'
              )}>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] font-black text-slate-800 truncate">{req.targetDoctorName}</p>
                  <span className={cn(
                    'text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0',
                    req.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  )}>
                    {req.status}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 line-clamp-2 mb-2">{req.problem}</p>
                {req.status === 'accepted' && (
                  <button
                    onClick={() => setActiveChat(req.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-green-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-green-700"
                  >
                    <MessageSquare size={10} /> Start Chat
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
          <MapContainer center={[lat, lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {!liveCase && <MapClicker onPick={(la, lo) => { setLat(la); setLng(lo); }} />}
            <MapFly lat={lat} lng={lng} />
            <Marker position={[lat, lng]} />
            {hospitals.map(h => (
              <Marker key={h.id} position={[h.lat, h.lng]}
                icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063201.png', iconSize: [28, 28] })} />
            ))}
            {doctors.filter(d => d.isAvailable).map(d => (
              <Marker key={d.id} position={[d.lat, d.lng]}
                icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2813/2813083.png', iconSize: [28, 28] })} />
            ))}
          </MapContainer>
          <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
              {liveCase ? 'Emergency Active' : 'Click map to set location'}
            </span>
          </div>
        </div>

        {/* AI Banner */}
        <div className="h-16 bg-indigo-900 rounded-2xl flex items-center px-5 gap-4 text-white shrink-0 overflow-hidden relative">
          <div className="absolute right-2 opacity-10"><Bot size={60} /></div>
          <Sparkles size={18} className="text-indigo-300 shrink-0" />
          <div className="flex-1 z-10">
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">AI Seva — Medical Assistant</p>
            <p className="text-xs text-indigo-100 font-medium">
              {liveCase?.isCardiac
                ? 'Cardiac case detected. Nearest cardiac hospital prioritized.'
                : liveCase
                ? 'Help is on the way. Keep the patient calm and still.'
                : 'Ready to provide first-aid guidance. Click the chat icon →'}
            </p>
          </div>
        </div>
      </div>

      {/* Right sidebar — Best Hospital */}
      <aside className="w-60 flex flex-col gap-3 overflow-y-auto shrink-0">
        <div className="card-base">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Best Facility</h3>
            {liveCase?.isCardiac && (
              <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">CARDIAC</span>
            )}
          </div>
          {bestHospital ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-black text-slate-800 leading-tight">{bestHospital.name}</p>
                <span className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded ml-1 shrink-0">AI PICK</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-3">{bestHospital.hasICU ? 'Level I Trauma · ICU' : 'Primary Care'}</p>
              <div className="grid grid-cols-3 gap-1 text-center">
                {([['BEDS', bestHospital.availableBeds], ['ICU', bestHospital.hasICU ? 'YES' : 'NO'], ['DIST', `${dist(bestHospital.lat, bestHospital.lng).toFixed(1)}k`]] as [string, string | number][]).map(([l, v]) => (
                  <div key={l} className="bg-white rounded-lg p-1.5 border border-slate-100">
                    <p className="text-[8px] font-bold text-slate-400">{l}</p>
                    <p className="text-xs font-black text-slate-700">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              {hospitals.length === 0 ? 'No hospitals registered' : 'Submit case to see recommendation'}
            </p>
          )}
        </div>

        {/* Emergency Log — live */}
        <div className="card-base flex-1 overflow-hidden flex flex-col min-h-0">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Emergency Log</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="relative pl-5 border-l-2 border-green-400">
              <div className="absolute -left-1.5 top-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              <p className="text-[9px] font-black text-slate-400 uppercase">System</p>
              <p className="text-xs font-bold text-slate-700">
                {firestoreReady ? 'Network connected' : 'Connecting...'}
              </p>
            </div>
            {liveCase && (
              <>
                <div className="relative pl-5 border-l-2 border-red-400">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 bg-red-400 rounded-full border-2 border-white" />
                  <p className="text-[9px] font-black text-slate-400 uppercase">AI Analysis</p>
                  <p className="text-xs font-bold text-slate-700 capitalize">Severity: {liveCase.severity} · Score: {liveCase.survivalScore}%</p>
                </div>
                <div className="relative pl-5 border-l-2 border-blue-400">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 bg-blue-400 rounded-full border-2 border-white" />
                  <p className="text-[9px] font-black text-slate-400 uppercase">Broadcast</p>
                  <p className="text-xs font-bold text-slate-700">Alert sent to all units</p>
                </div>
                <div className={cn('relative pl-5 border-l-2', liveCase.status === 'assigned' ? 'border-green-400' : 'border-amber-400')}>
                  <div className={cn('absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white', liveCase.status === 'assigned' ? 'bg-green-400' : 'bg-amber-400 animate-pulse')} />
                  <p className="text-[9px] font-black text-slate-400 uppercase">Ambulance</p>
                  <p className="text-xs font-bold text-slate-700">
                    {liveCase.status === 'assigned' ? `${liveCase.assignedAmbulance} dispatched` : 'Awaiting response...'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Chat Modal for Accepted Consult */}
      <AnimatePresence>
        {activeChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setActiveChat(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md h-[500px] overflow-hidden shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <ConsultChat consultId={activeChat} sender="patient" onClose={() => setActiveChat(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
