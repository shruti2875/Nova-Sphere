import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { User, Truck, Hospital, UserRound, ArrowRight } from 'lucide-react';
import { Role } from '../types';

const roles = [
  {
    id: 'PATIENT' as Role,
    title: 'Patient / Caller',
    description: 'Report an emergency or request immediate help.',
    icon: User,
    color: 'bg-red-500',
    path: '/patient'
  },
  {
    id: 'AMBULANCE' as Role,
    title: 'Ambulance Driver',
    description: 'Track and respond to nearby emergency cases.',
    icon: Truck,
    color: 'bg-orange-500',
    path: '/ambulance'
  },
  {
    id: 'HOSPITAL' as Role,
    title: 'Hospital Admin',
    description: 'Manage bed availability and ICU status.',
    icon: Hospital,
    color: 'bg-blue-500',
    path: '/hospital'
  },
  {
    id: 'DOCTOR' as Role,
    title: 'Medical Doctor',
    description: 'Consult on critical cases and manage availability.',
    icon: UserRound,
    color: 'bg-emerald-500',
    path: '/doctor'
  }
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const { setRole } = useApp();

  const handleSelect = (role: Role, path: string) => {
    setRole(role);
    navigate(path);
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center -mt-16">
      <div className="text-center mb-12">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-black text-slate-900 mb-4 tracking-tight"
        >
          WELCOME TO <span className="text-red-600">RAPID SEVA</span>
        </motion.h1>
        <motion.p 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-500 font-medium text-lg max-w-lg mx-auto"
        >
          Connecting people, medical professionals, and rescue teams in real-time during emergencies.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {roles.map((role, index) => (
          <motion.button
            key={role.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(role.id, role.path)}
            className="group card-base hover:shadow-xl hover:-translate-y-1 transition-all text-left overflow-hidden cursor-pointer flex gap-5 items-center"
          >
            <div className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-200 transition-transform group-hover:scale-105`}>
              <role.icon className="text-white w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{role.title}</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-3">{role.description}</p>
              <div className="flex items-center gap-1 text-slate-400 font-black text-[10px] uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                ENTER DASHBOARD <ArrowRight size={12} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Rescue Network is Online</span>
        </div>
      </motion.div>
    </div>
  );
}
