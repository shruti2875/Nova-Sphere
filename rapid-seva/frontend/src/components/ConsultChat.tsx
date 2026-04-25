import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChatMessage } from '../types';
import { cn } from '../lib/utils';

interface Props {
  consultId: string;
  sender: 'patient' | 'doctor';
}

export default function ConsultChat({ consultId, sender }: Props) {
  const { sendChatMessage, getChatMessages } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = getChatMessages(consultId, setMessages);
    return unsub;
  }, [consultId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await sendChatMessage({ consultId, sender, text: text.trim(), timestamp: Date.now() });
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-6">
            Consultation started — send a message
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} className={cn('flex', m.sender === sender ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[75%] px-3 py-2 rounded-2xl text-xs font-medium',
              m.sender === sender
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
            )}>
              <p className={cn('text-[9px] font-black uppercase mb-0.5', m.sender === sender ? 'text-indigo-300' : 'text-slate-400')}>
                {m.sender === 'doctor' ? 'Doctor' : 'Patient'}
              </p>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="input-base flex-1 text-sm"
        />
        <button type="submit" disabled={!text.trim()} className="btn-primary px-3 py-2">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
