import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SYSTEM_PROMPT = `You are an AI Medical Emergency Assistant for Rapid Seva, an emergency response system in India.
Your role is to provide clear, calm, step-by-step first-aid guidance during medical emergencies.

Rules:
- Always be concise and actionable — people are in crisis
- Always tell them to call 112 (India emergency number) for serious cases
- Use numbered steps for instructions
- For cardiac/breathing emergencies, always prioritize CPR guidance
- Never diagnose — only provide first-aid guidance
- Keep responses under 150 words unless detailed steps are needed
- Use simple language — the person may be panicking`;

const QUICK_ACTIONS = [
  'CPR instructions',
  'Stop bleeding',
  'Stroke symptoms',
  'Burn treatment',
  'Choking response',
  'Fracture first aid',
  'Unconscious person',
];

// Fallback responses when Gemini is unavailable
const FALLBACK: Record<string, string> = {
  cpr: '1. Call 112\n2. Push chest hard & fast — 100-120/min\n3. 30 compressions → 2 rescue breaths\n4. Continue until help arrives',
  bleed: '1. Apply firm pressure with clean cloth\n2. Do NOT remove cloth — add more on top\n3. Elevate above heart level\n4. Call 112 for severe bleeding',
  stroke: 'FAST test:\nF — Face drooping?\nA — Arm weakness?\nS — Speech slurred?\nT — Time to call 112 immediately!\nDo NOT give food or water.',
  burn: '1. Cool with running water 10-20 min\n2. No ice, butter or toothpaste\n3. Cover loosely with clean cloth\n4. Call 112 for large/deep burns',
  chok: '1. Encourage coughing\n2. 5 firm back blows between shoulders\n3. 5 abdominal thrusts (Heimlich)\n4. Alternate until cleared or call 112',
  heart: '1. Call 112 immediately\n2. Sit/lie patient down — no walking\n3. Loosen tight clothing\n4. Give aspirin 325mg if not allergic\n5. Be ready to do CPR',
  accident: '1. Call 112 immediately\n2. Do NOT move patient\n3. Control bleeding with pressure\n4. Keep patient warm and still\n5. Monitor breathing',
  fracture: '1. Do NOT try to straighten the bone\n2. Immobilize with splint/padding\n3. Apply ice pack (wrapped in cloth)\n4. Elevate if possible\n5. Call 112 for severe fractures',
  unconscious: '1. Call 112 immediately\n2. Check breathing — tilt head back\n3. If not breathing — start CPR\n4. If breathing — recovery position\n5. Stay until help arrives',
};

function getFallback(query: string): string {
  const q = query.toLowerCase();
  for (const [key, response] of Object.entries(FALLBACK)) {
    if (q.includes(key)) return response;
  }
  return 'Stay calm. Call 112 immediately.\nKeep the patient still and comfortable.\nDo not give food or water.\nStay on the line with emergency services.';
}

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Emergency mode active. I am your Medical AI Assistant powered by Gemini.\n\nAsk me for first-aid guidance, CPR instructions, or any emergency advice.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiReady, setGeminiReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Gemini chat session
  useEffect(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') return;

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_PROMPT,
      });
      chatRef.current = model.startChat({ history: [] });
      setGeminiReady(true);
    } catch {
      setGeminiReady(false);
    }
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      if (geminiReady && chatRef.current) {
        // Use Gemini
        const result = await chatRef.current.sendMessage(text);
        const reply = result.response.text();
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      } else {
        // Try Flask backend
        const res = await fetch('http://localhost:5000/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text }),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
        } else {
          throw new Error('Flask offline');
        }
      }
    } catch {
      // Local fallback
      setMessages(prev => [...prev, { role: 'assistant', text: getFallback(text) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Status bar */}
      <div className={`px-3 py-1.5 flex items-center gap-2 shrink-0 ${geminiReady ? 'bg-green-50 border-b border-green-100' : 'bg-amber-50 border-b border-amber-100'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${geminiReady ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${geminiReady ? 'text-green-700' : 'text-amber-700'}`}>
          {geminiReady ? 'Gemini AI Connected' : 'Using offline responses — add VITE_GEMINI_API_KEY to .env'}
        </span>
      </div>

      {/* Quick actions */}
      <div className="p-2.5 border-b border-slate-100 flex gap-1.5 overflow-x-auto shrink-0">
        {QUICK_ACTIONS.map(q => (
          <button
            key={q}
            onClick={() => send(q)}
            className="shrink-0 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] p-3 rounded-2xl shadow-sm ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                {m.role === 'user' ? <User size={9} /> : <Sparkles size={9} />}
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {m.role === 'user' ? 'YOU' : 'AI ASSISTANT'}
                </span>
              </div>
              {/* Preserve newlines from Gemini response */}
              <p className="text-xs font-medium leading-relaxed whitespace-pre-line">{m.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 size={14} className="text-indigo-500 animate-spin" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {geminiReady ? 'Gemini thinking...' : 'Processing...'}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Ask for emergency guidance..."
            className="flex-1 px-3 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400 outline-none transition-all"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-40 shadow-lg shadow-indigo-100"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[9px] text-slate-400 text-center mt-2 font-bold uppercase tracking-widest">
          {geminiReady ? 'Powered by Google Gemini' : 'Offline mode — add API key to enable Gemini'}
        </p>
      </div>
    </div>
  );
}
