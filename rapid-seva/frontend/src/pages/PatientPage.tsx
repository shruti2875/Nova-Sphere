import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Send, AlertTriangle, Hospital, User, Clock, HeartPulse, ShieldAlert, AlertCircle, UserRound, Bot } from 'lucide-react';
import { Severity, Location } from '../types';
import { cn } from '../lib/utils';

// Fix Leaflet icon issue by using static paths if assets fail
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationSelector({ onLocationChange }: { onLocationChange: (loc: Location) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapUpdater({ center }: { center: Location }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

export default function PatientPage() {
  const { createCase, hospitals, doctors, fetchHospitals, fetchDoctors } = useApp();
  const [location, setLocation] = useState<Location>({ lat: 18.5204, lng: 73.8567 });
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    fetchHospitals();
    fetchDoctors();
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  useEffect(() => {
    if (isSubmitted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isSubmitted, timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    const newCase = await createCase({ patientName: 'Patient', description, location });
    setSeverity(newCase.severity);
    setSurvivalScore(newCase.survivalScore ?? (newCase.severity === 'CRITICAL' ? 45 : 85));
    setIsSubmitted(true);
  };

  const calculateDistance = (l1: Location, l2: Location) =>
    Math.sqrt(Math.pow(l1.lat - l2.lat, 2) + Math.pow(l1.lng - l2.lng, 2)) * 111;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const bestHospital = hospitals[0] ?? null;

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 flex flex-col gap-4 overflow-y-auto pr-1">
        {!isSubmitted ? (
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="card-base"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-bold text-slate-800">REQUEST HELP</h2>
              <span className="badge-critical bg-blue-100 text-blue-700">PATIENT MODE</span>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-400 flex items-center gap-2">
                <MapPin size={12} className="text-red-500" />
                GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the medical emergency..."
                className="w-full p-4 h-32 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm transition-all"
                required
              />

              <button type="submit" className="btn-primary w-full shadow-red-100">
                REQUEST IMMEDIATE HELP
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-base"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="font-bold text-slate-800 uppercase tracking-tight">ACTIVE CASE</h2>
              <span className={cn(
                "badge-critical",
                severity === 'CRITICAL' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
              )}>
                {severity}
              </span>
            </div>

            <div className={cn(
              "p-4 rounded-xl border mb-4",
              severity === 'CRITICAL' ? "bg-red-50 border-red-100" : "bg-orange-50 border-orange-100"
            )}>
              <p className={cn(
                "text-sm font-bold mb-1",
                severity === 'CRITICAL' ? "text-red-900" : "text-orange-900"
              )}>Active Emergency</p>
              <p className={cn(
                "text-xs leading-tight opacity-80",
                severity === 'CRITICAL' ? "text-red-700" : "text-orange-700"
              )}>{description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Survival Score</p>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-slate-800">{survivalScore}</span>
                  <span className="text-sm font-bold text-green-500 mb-1">%</span>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Response ETA</p>
                <div className="flex items-end gap-1">
                  <span className="text-xl font-black text-slate-800">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${survivalScore}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  survivalScore > 70 ? "bg-green-500" : survivalScore > 40 ? "bg-orange-500" : "bg-red-600"
                )}
              />
            </div>
          </motion.div>
        )}

        <div className="card-base flex-1 overflow-hidden flex flex-col">
          <h2 className="font-bold text-slate-800 mb-3 uppercase tracking-tight text-xs">NEARBY DOCTORS</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {doctors.filter(d => d.isAvailable).map(doctor => (
              <div key={doctor.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">Dr.</div>
                <div className="flex-1">
                  <p className="text-sm font-bold truncate">{doctor.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                    {doctor.specialization} • {calculateDistance(location, doctor.location).toFixed(1)}km
                  </p>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Map Main */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
          <MapContainer 
            center={[location.lat, location.lng]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationSelector onLocationChange={setLocation} />
            <MapUpdater center={location} />
            
            <Marker position={[location.lat, location.lng]} />
            
            {hospitals.map(h => (
              <Marker key={h.id} position={[h.location.lat, h.location.lng]} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063201.png', iconSize: [32, 32] })} />
            ))}
            
            {doctors.filter(d => d.isAvailable).map(d => (
              <Marker key={d.id} position={[d.location.lat, d.location.lng]} icon={L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/2813/2813083.png', iconSize: [32, 32] })} />
            ))}
          </MapContainer>

          <div className="absolute top-6 left-6 z-10">
             <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Signal Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-sm font-bold text-slate-800">Downtown Medical Zone</p>
                </div>
             </div>
          </div>
        </div>

        <div className="h-24 bg-indigo-900 rounded-2xl flex items-center px-8 gap-6 text-white shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-1 opacity-10">
            <Bot size={80} />
          </div>
          <div className="flex-1 z-10">
            <h3 className="text-xs font-bold text-indigo-300 uppercase mb-1 tracking-widest">AI Seva Assistant</h3>
            <p className="text-sm text-indigo-50 font-medium truncate">
              {isSubmitted ? "Alert sent to nearby units. Keep patient calm and stay where you are." : "Ready to provide first-aid guidance if needed."}
            </p>
          </div>
          <div className="flex gap-2 z-10">
            <button className="px-6 py-2 bg-white text-indigo-900 rounded-lg font-black text-xs uppercase shadow-lg">Open Guide</button>
          </div>
        </div>
      </div>

      {/* Right Aside */}
      <aside className="w-72 flex flex-col gap-4 overflow-y-auto">
        <div className="card-base flex flex-col gap-4 overflow-hidden">
          <h2 className="font-bold text-slate-800 uppercase tracking-tight text-xs">BEST FACILITY</h2>
          {bestHospital ? (
          <div className="relative p-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
            <div className="absolute top-0 right-0 p-2">
              <span className="text-[10px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded">98% MATCH</span>
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">{bestHospital.name}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{bestHospital.hasICU ? 'Level I Trauma' : 'Primary Care'}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="text-center">
                 <p className="text-[10px] font-bold text-slate-400">BEDS</p>
                 <p className="text-sm font-black text-slate-700">{bestHospital.availableBeds}</p>
              </div>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <div className="text-center">
                 <p className="text-[10px] font-bold text-slate-400">ICU</p>
                 <p className="text-sm font-black text-slate-700">{bestHospital.hasICU ? 'YES' : 'NO'}</p>
              </div>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <div className="text-center">
                 <p className="text-[10px] font-bold text-slate-400">DIST</p>
                 <p className="text-sm font-black text-slate-700">{calculateDistance(location, bestHospital.location).toFixed(1)}km</p>
              </div>
            </div>
          </div>
          ) : (
            <p className="text-xs text-slate-400">Loading facilities...</p>
          )}
          <button className="w-full py-2.5 border-2 border-slate-50 text-slate-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50">SEE ALL NETWORK</button>
        </div>

        <div className="card-base flex-1 flex flex-col gap-4 overflow-hidden">
          <h2 className="font-bold text-slate-800 uppercase tracking-tight text-xs">EMERGENCY LOG</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="relative pl-6 border-l-2 border-green-500">
              <div className="absolute -left-1.5 top-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase">SYSTEM</p>
              <p className="text-xs font-bold text-slate-700">Network connection stable</p>
            </div>
            {isSubmitted && (
              <>
                <div className="relative pl-6 border-l-2 border-green-500">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Alert</p>
                  <p className="text-xs font-bold text-slate-700">Emergency signal broadcasted</p>
                </div>
                <div className="relative pl-6 border-l-2 border-amber-400">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">PENDING</p>
                  <p className="text-xs font-bold text-slate-700">Waiting for ambulance response</p>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
