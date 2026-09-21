import React, { useState } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Clock,
  Sparkles,
  Phone
} from 'lucide-react';
import { PatientAppointment, ChatMessage } from '../types';
import { sampleChatTranscripts } from '../data/mockDashboardData';

interface ChatTakeoverModalProps {
  appointment: PatientAppointment;
  onClose: () => void;
  onToggleAi: (apptId: string, paused: boolean) => void;
}

export const ChatTakeoverModal: React.FC<ChatTakeoverModalProps> = ({
  appointment,
  onClose,
  onToggleAi,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    sampleChatTranscripts[appointment.id] || [
      {
        id: 'init-1',
        sender: 'AI',
        text: `Assalomu alaykum, ${appointment.patientName}! Qabulga yozilganingiz tasdiqlandi.`,
        timestamp: '14:00',
      },
      {
        id: 'init-2',
        sender: 'PATIENT',
        text: 'Rahmat! Qabul qachon boshlanadi?',
        timestamp: '14:02',
      }
    ]
  );
  const [inputText, setInputText] = useState<string>('');
  const [isAiPaused, setIsAiPaused] = useState<boolean>(appointment.aiPaused || true);

  const handleToggleAi = () => {
    const nextState = !isAiPaused;
    setIsAiPaused(nextState);
    onToggleAi(appointment.id, nextState);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'AGENT',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // If AI was not paused, pause it automatically when human intervenes
    if (!isAiPaused) {
      setIsAiPaused(true);
      onToggleAi(appointment.id, true);
    }
  };

  const cannedReplies = [
    "Klinikamizga xush kelibsiz! Shifokorimiz hozir sizni qabul qilishga tayyorlanmoqda.",
    "Bemor ko'rigi 5-10 daqiqaga cho'zildi, iltimos kuting.",
    "Iltimos, qabulxona (reception)ga yaqinlashing.",
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full h-[640px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  {appointment.patientName}
                </h3>
                <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                  #{appointment.ticketNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{appointment.patientPhone}</span>
                <span>•</span>
                <span className="text-cyan-400">{appointment.doctorName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Pause/Resume Button */}
            <button
              onClick={handleToggleAi}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 border ${
                isAiPaused
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-xs'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isAiPaused ? (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI: To'xtatilgan (Xodim nazoratida)</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI: Avtomatik Javob</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telegram Chat Status Bar */}
        <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Telegram Bot orqali to'g'ridan-to'g'ri xavfsiz ulanish
          </span>
          <span>Sinxronizatsiya: Real-vaqt</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/50">
          {messages.map((msg) => {
            const isPatient = msg.sender === 'PATIENT';
            const isAi = msg.sender === 'AI';
            const isAgent = msg.sender === 'AGENT';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1 px-1">
                  {isPatient && <span>Bemor ({appointment.patientName})</span>}
                  {isAi && (
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Bot className="w-3 h-3" /> MedAgent AI
                    </span>
                  )}
                  {isAgent && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> Reception Admin (Siz)
                    </span>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                    isPatient
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-none'
                      : isAi
                      ? 'bg-cyan-950/70 text-cyan-100 border border-cyan-800/50 rounded-tr-none'
                      : 'bg-emerald-950/70 text-emerald-100 border border-emerald-800/50 rounded-tr-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Canned responses */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
          {cannedReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => setInputText(reply)}
              className="shrink-0 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700/50 transition truncate max-w-[200px]"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Bemorga Telegram orqali javob yozing..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Yuborish</span>
          </button>
        </form>
      </div>
    </div>
  );
};
