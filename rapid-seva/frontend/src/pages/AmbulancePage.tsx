import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, ShieldAlert, CheckCircle, Navigation, X, Zap, Route, Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmergencyCase, Severity } from '../types';
import { cn } from '../lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────
const AMB_START: [number, number] = [18.5204, 73.8567]; // default ambulance position

const SEV_COLOR: Record<Severity, string> = {
  low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-600',
};
const SEV_TEXT: Record<Severity, string> = {
  low: 'text-green-700', medium: 'text-yellow-700', high: 'text-orange-700', critical: 'text-red-700',
};
const SEV_BG: Record<Severity, string> = {
  low: 'bg-green-50', medium: 'bg-yellow-50', high: 'bg-orange-50', critical: 'bg-red-50',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function etaMinutes(km: number) {
  return Math.max(1, Math.round((km / 40) * 60));
}

// Interpolate N points along a straight line for simulation
function interpolatePath(
  from: [number, number],
  to: [number, number],
  steps: number
): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => [
    from[0] + ((to[0] - from[0]) * i) / steps,
    from[1] + ((to[1] - from[1]) * i) / steps,
  ]);
}

// ── Leaflet icons ─────────────────────────────────────────────────────────────
const AMB_ICON = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2966/2966327.png',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const PATIENT_ICON = (severity: Severity, selected: boolean) => {
  const colors: Record<Severity, string> = {
    low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#dc2626',
  };
  const size = selected ? 38 : 28;
  const color = colors[severity];
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
    (selected ? `<circle cx="20" cy="20" r="19" fill="${color}" opacity="0.2"/>` : '') +
    `<circle cx="20" cy="20" r="${selected ? 12 : 9}" fill="${color}" stroke="white" stroke-width="2.5"/>` +
    `<text x="20" y="25" text-anchor="middle" font-size="13" fill="white" font-weight="bold">+</text>` +
    `</svg>`
  );
  return L.icon({ iconUrl: `data:image/svg+xml,${svg}`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
};

// ── Map controller: fits bounds when route changes ────────────────────────────
function MapController({
  ambPos,
  casePos,
}: {
  ambPos: [number, number] | null;
  casePos: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (ambPos && casePos) {
      const bounds = L.latLngBounds([ambPos, casePos]).pad(0.25);
      map.flyToBounds(bounds, { duration: 1.2 });
    }
  }, [ambPos?.[0], ambPos?.[1], casePos?.[0], casePos?.[1]]);
  return null;
}

// ── Case card ─────────────────────────────────────────────────────────────────
function CaseCard({
  c,
  selected,
  navigating,
  onAccept,
  onComplete,
  onNavigate,
}: {
  c: EmergencyCase;
  selected: boolean;
  navigating: boolean;
  onAccept: () => void;
  onComplete: () => void;
  onNavigate: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'relative p-4 rounded-2xl border transition-all',
        selected
          ? 'bg-blue-50 border-blue-300 shadow-md shadow-blue-100'
          : c.status === 'pending'
          ? 'bg-white border-slate-200 hover:border-slate-300'
          : 'bg-white border-slate-200'
      )}
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
          {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
        </div>
        {c.status === 'pending' && (
          <button
            onClick={onAccept}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
          >
            ACCEPT DISPATCH
          </button>
        )}
        {c.status === 'assigned' && (
          <div className="flex gap-2">
            <button
              onClick={onNavigate}
              className={cn(
                'flex-1 py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all',
                navigating
                  ? 'bg-blue-700 text-white animate-pulse'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              <Navigation size={11} />
              {navigating ? 'Navigating...' : 'NAVIGATE'}
            </button>
            <button
              onClick={onComplete}
              className="py-2 px-3 bg-green-100 text-green-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 hover:bg-green-200 transition-colors"
            >
              <CheckCircle size={11} /> DONE
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AmbulancePage() {
  const { cases, acceptCase, completeCase } = useApp();
  const [tab, setTab] = useState<'pending' | 'assigned'>('pending');
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);
  const [ambPos, setAmbPos] = useState<[number, number]>(AMB_START);
  const [simulating, setSimulating] = useState(false);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simPath = useRef<[number, number][]>([]);
  const simStep = useRef(0);

  const pending = cases.filter(c => c.status === 'pending');
  const assigned = cases.filter(c => c.status === 'assigned');
  const active = cases.filter(c => c.status !== 'completed');

  // Distance + ETA for selected case
  const distKm = selectedCase
    ? haversineKm(ambPos[0], ambPos[1], selectedCase.lat, selectedCase.lng)
    : null;
  const eta = distKm !== null ? etaMinutes(distKm) : null;

  // ── Navigation handler ──────────────────────────────────────────────────────
  const handleNavigate = useCallback((c: EmergencyCase) => {
    // 1. Open Google Maps in new tab
    const url = `https://www.google.com/maps/dir/?api=1&origin=${ambPos[0]},${ambPos[1]}&destination=${c.lat},${c.lng}&travelmode=driving`;
    window.open(url, '_blank');

    // 2. Set in-app route
    setSelectedCase(c);

    // 3. Start simulation
    startSimulation(ambPos, [c.lat, c.lng]);
  }, [ambPos]);

  const startSimulation = (from: [number, number], to: [number, number]) => {
    if (simRef.current) clearInterval(simRef.current);
    const path = interpolatePath(from, to, 30);
    simPath.current = path;
    simStep.current = 0;
    setSimulating(true);
    setAmbPos(path[0]);

    simRef.current = setInterval(() => {
      simStep.current += 1;
      if (simStep.current >= path.length) {
        clearInterval(simRef.current!);
        setSimulating(false);
        setAmbPos(to);
        return;
      }
      setAmbPos(path[simStep.current]);
    }, 800);
  };

  const stopNavigation = () => {
    if (simRef.current) clearInterval(simRef.current);
    setSimulating(false);
    setSelectedCase(null);
    setAmbPos(AMB_START);
  };

  // Cleanup on unmount
  useEffect(() => () => { if (simRef.current) clearInterval(simRef.current); }, []);

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="flex flex-col gap-3 shrink-0" style={{ width: '22rem' }}>
        <div className="card-base flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="font-black text-slate-800 text-sm uppercase">Mission Control</h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {(['pending', 'assigned'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-3 py-1 rounded-md text-[10px] font-black transition-all',
                    tab === t ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'
                  )}
                >
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
                  selected={selectedCase?.id === c.id}
                  navigating={simulating && selectedCase?.id === c.id}
                  onAccept={() => { acceptCase(c.id, 'AMB-001'); setTab('assigned'); }}
                  onComplete={() => { completeCase(c.id); if (selectedCase?.id === c.id) stopNavigation(); }}
                  onNavigate={() => handleNavigate(c)}
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

      {/* ── Map + panels ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative">
          <MapContainer center={AMB_START} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Fit map to route when selectedCase changes */}
            <MapController
              ambPos={selectedCase ? ambPos : null}
              casePos={selectedCase ? [selectedCase.lat, selectedCase.lng] : null}
            />

            {/* Ambulance marker */}
            <Marker position={ambPos} icon={AMB_ICON}>
              <Popup>
                <p className="font-bold text-xs">AMB-001</p>
                <p className="text-[10px] opacity-70">{simulating ? 'En route...' : 'Standby'}</p>
              </Popup>
            </Marker>

            {/* Case markers */}
            {active.map(c => (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={PATIENT_ICON(c.severity, selectedCase?.id === c.id)}
                eventHandlers={{ click: () => setSelectedCase(c) }}
              >
                <Popup>
                  <p className="font-bold text-xs">{c.patientName}</p>
                  <p className="text-[10px] opacity-70 capitalize">{c.severity} · {c.status}</p>
                </Popup>
              </Marker>
            ))}

            {/* Route polyline */}
            {selectedCase && (
              <Polyline
                positions={[ambPos, [selectedCase.lat, selectedCase.lng]]}
                pathOptions={{
                  color: '#2563eb',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: simulating ? '10 8' : undefined,
                }}
              />
            )}
          </MapContainer>

          {/* Unit status badge */}
          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase">Unit Status</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={cn('w-2 h-2 rounded-full', simulating ? 'bg-blue-500 animate-pulse' : 'bg-green-500 animate-pulse')} />
                <p className="text-xs font-black text-slate-800">
                  AMB-001 {simulating ? 'EN ROUTE' : 'ACTIVE'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Floating route info panel ── */}
          <AnimatePresence>
            {selectedCase && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute top-4 right-4 z-20 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
              >
                {/* Header */}
                <div className="px-4 py-3 bg-blue-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Route size={14} className="text-blue-200" />
                    <span className="text-[11px] font-black text-white uppercase tracking-widest">Route Active</span>
                  </div>
                  <button onClick={stopNavigation} className="text-blue-200 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Stats */}
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Distance</p>
                      <p className="text-sm font-black text-slate-800">{distKm?.toFixed(1)}<span className="text-[10px] text-slate-400 ml-0.5">km</span></p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
                      <p className="text-[8px] font-black text-blue-400 uppercase mb-0.5">ETA</p>
                      <p className="text-sm font-black text-blue-700">{eta}<span className="text-[10px] text-blue-400 ml-0.5">min</span></p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Patient</p>
                    <p className="text-xs font-black text-slate-800">{selectedCase.patientName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{selectedCase.description}</p>
                  </div>

                  <div className={cn('flex items-center gap-2 px-2.5 py-2 rounded-xl border text-[10px] font-black uppercase',
                    SEV_BG[selectedCase.severity], SEV_TEXT[selectedCase.severity],
                    selectedCase.severity === 'critical' ? 'border-red-200' : 'border-transparent'
                  )}>
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', SEV_COLOR[selectedCase.severity],
                      selectedCase.severity === 'critical' ? 'animate-pulse' : '')} />
                    {selectedCase.severity.toUpperCase()} SEVERITY
                  </div>

                  {simulating && (
                    <div className="flex items-center gap-2 px-2.5 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                      <Zap size={11} className="text-blue-600 animate-pulse shrink-0" />
                      <span className="text-[10px] font-black text-blue-700">Simulating movement...</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&origin=${ambPos[0]},${ambPos[1]}&destination=${selectedCase.lat},${selectedCase.lng}&travelmode=driving`;
                      window.open(url, '_blank');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-colors"
                  >
                    <Navigation size={12} /> Open in Google Maps
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Stats bar ── */}
        <div className="h-16 bg-white rounded-2xl flex items-center px-6 gap-8 border border-slate-200 shadow-sm shrink-0">
          {[
            { label: 'Pending', value: pending.length, color: 'text-red-600' },
            { label: 'Assigned', value: assigned.length, color: 'text-blue-600' },
            { label: 'ETA', value: eta ? `${eta} min` : '—', color: 'text-slate-800' },
            { label: 'Distance', value: distKm ? `${distKm.toFixed(1)} km` : '—', color: 'text-slate-800' },
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
