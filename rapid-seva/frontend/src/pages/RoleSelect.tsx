import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { User, Truck, Building2, Stethoscope, ArrowRight, Shield } from 'lucide-react';
import { Role } from '../types';

const ROLES = [
  { id: 'PATIENT' as Role, title: 'Patient / Caller', desc: 'Report an emergency and request immediate help.', icon: User, color: 'bg-red-500', shadow: 'shadow-red-100', path: '/patient' },
  { id: 'AMBULANCE' as Role, title: 'Ambulance Driver', desc: 'View and respond to nearby emergency cases.', icon: Truck, color: 'bg-orange-500', shadow: 'shadow-orange-100', path: '/ambulance' },
  { id: 'HOSPITAL' as Role, title: 'Hospital Admin', desc: 'Manage bed availability and incoming patients.', icon: Building2, color: 'bg-blue-500', shadow: 'shadow-blue-100', path: '/hospital' },
  { id: 'DOCTOR' as Role, title: 'Medical Doctor', desc: 'Consult on critical cases and set availability.', icon: Stethoscope, color: 'bg-emerald-500', shadow: 'shadow-emerald-100', path: '/doctor' },
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const { setRole } = useApp();

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
          <Shield size={12} /> Emergency Response Network
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
          WELCOME TO <span className="text-red-600">RAPID SEVA</span>
        </h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          AI-powered emergency coordination. Select your role to enter the dashboard.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {ROLES.map((role, i) => (
          <motion.button
            key={role.id}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => { setRole(role.id); navigate(role.path); }}
            className={`group card-base hover:shadow-lg hover:-translate-y-0.5 transition-all text-left flex items-center gap-4 cursor-pointer`}
          >
            <div className={`w-14 h-14 ${role.color} rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${role.shadow} group-hover:scale-105 transition-transform`}>
              <role.icon className="text-white w-7 h-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-800 text-sm mb-0.5">{role.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{role.desc}</p>
            </div>
            <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
          </motion.button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Rescue Network Online</span>
      </motion.div>
    </div>
  );
}
