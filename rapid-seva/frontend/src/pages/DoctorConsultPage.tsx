import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Stethoscope, CheckCircle, XCircle, Clock, MessageSquare, User, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import ConsultChat from '../components/ConsultChat';
import { ConsultRequest } from '../types';

const STATUS_STYLE = {
  pending:  { color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Pending',  dot: 'bg-amber-400' },
  accepted: { color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Accepted', dot: 'bg-green-500' },
  rejected: { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Rejected', dot: 'bg-red-400' },
};

function RequestCard({
  req,
  onAccept,
  onReject,
  onChat,
  responding,
}: {
  req: ConsultRequest;
  onAccept: () => void;
  onReject: () => void;
  onChat: () => void;
  responding: boolean;
}) {
  const st = STATUS_STYLE[req.status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('p-3 rounded-xl border', st.bg, st.border)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200 shrink-0">
            <User size={14} className="text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-800 uppercase truncate">{req.patientName}</p>
            <div className="flex items-center gap-1">
              <div className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
              <p className={cn('text-[9px] font-bold uppercase', st.color)}>{st.label}</p>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 shrink-0">{new Date(req.timestamp).toLocaleTimeString()}</p>
      </div>

      <p className="text-xs text-slate-700 bg-white rounded-lg p-2 border border-slate-100 mb-2 leading-relaxed">
        {req.problem}
      </p>

      {req.matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {req.matchedKeywords.map(k => (
            <span key={k} className="text-[8px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{k}</span>
          ))}
        </div>
      )}

      {req.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={onAccept}
            disabled={responding}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle size={11} /> ACCEPT
          </button>
          <button
            onClick={onReject}
            disabled={responding}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <XCircle size={11} /> REJECT
          </button>
        </div>
      )}

      {req.status === 'accepted' && (
        <button
          onClick={onChat}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-indigo-700 transition-colors"
        >
          <MessageSquare size={11} /> OPEN CHAT
        </button>
      )}
    </motion.div>
  );
}

export default function DoctorConsultPage() {
  const { doctors, consultRequests, respondToConsult } = useApp();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [responding, setResponding] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const myRequests = consultRequests.filter(r => r.targetDoctorId === selectedDoctorId);
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  const handleRespond = async (consultId: string, status: 'accepted' | 'rejected') => {
    setResponding(consultId);
    try {
      await respondToConsult(consultId, status);
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      {/* Left — doctor selector + request list */}
      <aside className="w-80 flex flex-col gap-3 overflow-y-auto shrink-0">
        {/* Doctor selector */}
        <div className="card-base">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
              <Stethoscope className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase">Consult Inbox</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Select your profile</p>
            </div>
          </div>
          <select
            value={selectedDoctorId}
            onChange={e => { setSelectedDoctorId(e.target.value); setActiveChat(null); }}
            className="input-base w-full text-sm"
          >
            <option value="">— Select Doctor —</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} · {d.specialization}</option>
            ))}
          </select>
          {selectedDoctor && (
            <div className="mt-3 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-indigo-800 uppercase">{selectedDoctor.name}</p>
                <p className="text-[9px] font-bold text-indigo-500 uppercase">{selectedDoctor.specialization}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', selectedDoctor.isAvailable ? 'bg-green-500' : 'bg-slate-300')} />
                <span className="text-[9px] font-black text-slate-500 uppercase">
                  {selectedDoctor.isAvailable ? 'Available' : 'Offline'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Requests */}
        {selectedDoctorId && (
          <div className="card-base flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Patient Requests
              </h3>
              {pendingCount > 0 && (
                <span className="w-5 h-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {myRequests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <Clock size={24} className="mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-widest">No requests yet</p>
                </div>
              )}
              {myRequests.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  onAccept={() => handleRespond(req.id, 'accepted')}
                  onReject={() => handleRespond(req.id, 'rejected')}
                  onChat={() => setActiveChat(req.id)}
                  responding={responding === req.id}
                />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Right — chat or placeholder */}
      <main className="flex-1 flex flex-col gap-3 min-w-0">
        {activeChat ? (
          <div className="flex-1 card-base flex flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <User size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {consultRequests.find(r => r.id === activeChat)?.patientName}
                  </p>
                  <p className="text-[9px] font-bold text-green-600 uppercase">● Consultation Active</p>
                </div>
              </div>
              <button onClick={() => setActiveChat(null)} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConsultChat consultId={activeChat} sender="doctor" />
            </div>
          </div>
        ) : (
          <div className="flex-1 card-base flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <MessageSquare size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-700 uppercase">Doctor Consult Inbox</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select your doctor profile on the left to view incoming patient consultation requests.
              </p>
            </div>
            {!selectedDoctorId && doctors.length === 0 && (
              <p className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                No doctors registered yet. Go to the Doctor tab to register first.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
