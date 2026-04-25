import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';

export default function AIPanel() {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Emergency mode active. I am your Medical Assistant. How can I provide first aid guidance or medical info today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // TODO: Connect to backend AI API endpoint
      // Replace with actual backend call: POST /api/assistant
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) {
        throw new Error('Backend API not available');
      }

      const data = await response.json();
      const text = data.response || 'I could not generate a response. Please seek professional help.';
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('AI Error:', error);
      // Fallback: Show a message that backend needs to be connected
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'AI Assistant awaiting backend connection. Please ensure the backend API is running at /api/assistant' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-indigo-100' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-none shadow-sm'
            } p-4 shadow-lg`}>
              <div className="flex items-center gap-2 mb-2 opacity-60">
                {m.role === 'user' ? <User size={10} /> : <Sparkles size={10} />}
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  {m.role === 'user' ? 'REQUESTER' : 'ASSISTANT'}
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-indigo-50 p-4 rounded-2xl rounded-tl-none border border-indigo-100 flex items-center gap-3 shadow-sm animate-pulse">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Processing Bio-Signals...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type medical query..."
            className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 justify-center">
            <div className="h-[1px] flex-1 bg-slate-100"></div>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">AI Protocol v2.4</span>
            <div className="h-[1px] flex-1 bg-slate-100"></div>
        </div>
      </div>
    </div>
  );
}
