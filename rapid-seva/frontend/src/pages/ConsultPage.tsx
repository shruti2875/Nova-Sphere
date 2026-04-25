import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, Send, CheckCircle, XCircle, Clock, MessageSquare, Building2, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Doctor, Hospital, ConsultRequest } from '../types';
import { cn } from '../lib/utils';
import ConsultChat from '../components/ConsultChat';

// Keyword → specialization matching
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
      // fallback: General Physician always scores 1 if no match
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
    .slice(0, 2)
    .map(x => x.h);
}

const STATUS_STYLE = {
  pending:  { icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Pending' },
  accepted: { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Accepted' },
  rejected: { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Rejected' },
};

export default function ConsultPage() {
  const { doctors, hospitals, consultRequests, sendConsultRequest } = useApp();
  const [patientName, setPatientName] = useState('');
  const [problem, setProblem] = useState('');
  const [lat] = useState(18.5204);
  const [lng] = useState(73.8567);
  const [matched, setMatched] = useState<{ doctor: Doctor; keywords: string[] }[]>([]);
  const [matchedHospitals, setMatchedHospitals] = useState<Hospital[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null); // consultId

  // My sent requests (keyed by doctorId for quick lookup)
  const myRequests = consultRequests.filter(r => r.patientName === patientName && patientName.trim() !== '');

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem.trim() || !patientName.trim()) return;
    setMatched(matchDoctors(problem, doctors));
    setMatchedHospitals(matchHospitals(problem, hospitals));
    setAnalyzed(true);
  };

  const handleSendRequest = async (doctor: Doctor, keywords: string[]) => {
    setSending(doctor.id);
    try {
      await sendConsultRequest({
        patientName: patientName.trim(),
        problem: problem.trim(),
        matchedKeywords: keywords,
        targetDoctorId: doctor.id,
        targetDoctorName: doctor.name,
        status: 'pending',
        timestamp: Date.now(),
        patientLat: lat,
        patientLng: lng,
      });
    } finally {
      setSending(null);
    }
  };

  const getRequestForDoctor = (doctorId: string) =>
    myRequests.find(r => r.targetDoctorId === doctorId) ?? null;

  const acceptedConsult = myRequests.find(r => r.status === 'accepted');

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      {/* Left — form + matches */}
      <aside className="w-80 flex flex-col gap-3 overflow-y-auto shrink-0">
        <div className="card-base">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
              <Stethoscope className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase">Teleconsult</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase">AI Doctor Matching</p>
            </div>
          </div>
          <form onSubmit={handleAnalyze} className="space-y-3">
            <input
              value={patientName}
              onChange={e => { setPatientName(e.target.value); setAnalyzed(false); }}
              placeholder="Your name"
              className="input-base w-full text-sm"
            />
            <textarea
              value={problem}
              onChange={e => { setProblem(e.target.value); setAnalyzed(false); }}
              placeholder="Describe your problem (e.g. I have chest pain and shortness of breath...)"
              className="input-base w-full h-28 resize-none text-sm"
            />
            <button type="submit" className="btn-primary w-full text-sm flex items-center justify-center gap-2">
              <Stethoscope size={14} /> FIND DOCTORS
            </button>
          </form>
        </div>

        {/* Matched Doctors */}
        <AnimatePresence>
          {analyzed && (
            <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-base">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                AI Matched Doctors ({matched.length})
              </h3>
              {matched.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No matching doctors available right now</p>
              )}
              <div className="space-y-2">
                {matched.map(({ doctor, keywords }) => {
                  const req = getRequestForDoctor(doctor.id);
                  const st = req ? STATUS_STYLE[req.status] : null;
                  const Icon = st?.icon;
                  return (
                    <div key={doctor.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-800 uppercase truncate">{doctor.name}</p>
                          <p className="text-[9px] font-bold text-indigo-600 uppercase">{doctor.specialization}</p>
                          {keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {keywords.map(k => (
                                <span key={k} className="text-[8px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{k}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">
                          {!req ? (
                            <button
                              onClick={() => handleSendRequest(doctor, keywords)}
                              disabled={sending === doctor.id}
                              className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                              {sending === doctor.id ? '...' : 'REQUEST'}
                            </button>
                          ) : (
                            <div className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase', st?.bg, st?.border, st?.color)}>
                              {Icon && <Icon size={10} />} {st?.label}
                            </div>
                          )}
                        </div>
                      </div>
                      {req?.status === 'accepted' && (
                        <button
                          onClick={() => setActiveChat(req.id)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-green-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-green-700 transition-colors"
                        >
                          <MessageSquare size={10} /> OPEN CHAT
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Matched Hospitals */}
        <AnimatePresence>
          {analyzed && matchedHospitals.length > 0 && (
            <motion.div key="hospitals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-base">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Suggested Hospitals
              </h3>
              <div className="space-y-2">
                {matchedHospitals.map(h => (
                  <div key={h.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
                    <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 size={13} className="text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-800 truncate">{h.name}</p>
                      <p className="text-[9px] font-bold text-red-600 uppercase">{h.specialization}</p>
                      {h.address && <p className="text-[9px] text-slate-400 truncate">{h.address}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{h.availableBeds} beds</span>
                        {h.hasICU && <span className="text-[8px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">ICU</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* Right — chat or status panel */}
      <main className="flex-1 flex flex-col gap-3 min-w-0">
        {activeChat ? (
          <div className="flex-1 card-base flex flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Stethoscope size={14} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {consultRequests.find(r => r.id === activeChat)?.targetDoctorName}
                  </p>
                  <p className="text-[9px] font-bold text-green-600 uppercase">● Consultation Active</p>
                </div>
              </div>
              <button onClick={() => setActiveChat(null)} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConsultChat consultId={activeChat} sender="patient" />
            </div>
          </div>
        ) : (
          <div className="flex-1 card-base flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Stethoscope size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-700 uppercase">Smart Teleconsultation</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Describe your problem on the left. Our AI will match you with the right doctor based on your symptoms.
              </p>
            </div>
            {myRequests.length > 0 && (
              <div className="w-full max-w-sm space-y-2 mt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Requests</p>
                {myRequests.map(r => {
                  const st = STATUS_STYLE[r.status];
                  const Icon = st.icon;
                  return (
                    <div key={r.id} className={cn('flex items-center justify-between p-2.5 rounded-xl border', st.bg, st.border)}>
                      <div className="flex items-center gap-2">
                        <Icon size={13} className={st.color} />
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-800">{r.targetDoctorName}</p>
                          <p className={cn('text-[9px] font-bold uppercase', st.color)}>{st.label}</p>
                        </div>
                      </div>
                      {r.status === 'accepted' && (
                        <button onClick={() => setActiveChat(r.id)} className="flex items-center gap-1 text-[9px] font-black text-green-700 uppercase hover:underline">
                          Chat <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
