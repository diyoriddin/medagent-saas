import React, { useState } from 'react';
import {
  Clock,
  User,
  Phone,
  PlayCircle,
  UserX,
  MessageSquare,
  CheckCircle2,
  Stethoscope,
  Radio,
  Sparkles,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { PatientAppointment } from '../types';

interface LiveQueueKanbanProps {
  appointments: PatientAppointment[];
  onStartSession: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onTakeoverChat: (appointment: PatientAppointment) => void;
  onCompleteSession: (id: string) => void;
}

export const LiveQueueKanban: React.FC<LiveQueueKanbanProps> = ({
  appointments,
  onStartSession,
  onMarkNoShow,
  onTakeoverChat,
  onCompleteSession,
}) => {
  const [monitorCallAlert, setMonitorCallAlert] = useState<string | null>(null);

  const pending = appointments.filter((a) => a.status === 'PENDING');
  const inProgress = appointments.filter((a) => a.status === 'IN_PROGRESS');
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const noShow = appointments.filter((a) => a.status === 'NO_SHOW');

  const handleStartSessionWithSound = (appt: PatientAppointment) => {
    onStartSession(appt.id);
    setMonitorCallAlert(`Qabul boshlandi: ${appt.ticketNumber} — ${appt.patientName} (${appt.doctorName} xonasi)`);
    setTimeout(() => setMonitorCallAlert(null), 5000);
  };

  const columns = [
    {
      id: 'PENDING',
      title: 'Kutilmoqda (Pending)',
      count: pending.length,
      items: pending,
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dotClass: 'bg-amber-400',
    },
    {
      id: 'IN_PROGRESS',
      title: 'Shifokor Qabulida',
      count: inProgress.length,
      items: inProgress,
      badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      dotClass: 'bg-cyan-400 animate-pulse',
    },
    {
      id: 'COMPLETED',
      title: 'Bajarildi (Completed)',
      count: completed.length,
      items: completed,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-400',
    },
    {
      id: 'NO_SHOW',
      title: 'Kelmadi (No-Show)',
      count: noShow.length,
      items: noShow,
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dotClass: 'bg-rose-400',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 p-6 overflow-hidden">
      {/* Top Header & Live TV Status */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Live Queue Navbat Doskasi
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Radio className="w-3 h-3 animate-pulse" />
              Real-Time SSE Faol
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Qabulxona xodimi va shifokorlar uchun real vaqt navbat boshqaruvi
          </p>
        </div>

        {/* Total Today Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Jami Bugun
            </span>
            <span className="text-base font-black text-white">
              {appointments.length}
            </span>
          </div>
        </div>
      </div>

      {/* Monitor Alert Banner if triggered */}
      {monitorCallAlert && (
        <div className="mt-4 p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top duration-300 shadow-lg shadow-cyan-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center font-bold">
              <Volume2 className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="text-xs font-bold text-cyan-200 block">
                Qabulxona Monitoriga E'lon Chiqarildi
              </span>
              <span className="text-xs text-cyan-300 font-medium">
                {monitorCallAlert}
              </span>
            </div>
          </div>
          <button
            onClick={() => setMonitorCallAlert(null)}
            className="text-xs text-cyan-400 hover:text-white px-2 py-1"
          >
            Yopish
          </button>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5 flex-1 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.id}
            className="bg-slate-900/70 rounded-2xl border border-slate-800/80 flex flex-col min-h-[500px] overflow-hidden"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotClass}`} />
                <span className="font-bold text-xs text-slate-200 tracking-wide">
                  {col.title}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-lg border text-xs font-bold ${col.badgeClass}`}
              >
                {col.count}
              </span>
            </div>

            {/* Cards Container */}
            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
              {col.items.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800/60 rounded-xl">
                  <p className="text-xs">Bemorlar yo'q</p>
                </div>
              ) : (
                col.items.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl p-3.5 shadow-sm transition-all duration-200 space-y-3"
                  >
                    {/* Ticket number & Time badge */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/50">
                        #{appt.ticketNumber}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {appt.startTime} - {appt.endTime}
                      </span>
                    </div>

                    {/* Patient info */}
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm leading-snug">
                        {appt.patientName}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {appt.patientPhone}
                      </p>
                    </div>

                    {/* Doctor Info */}
                    <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-300 font-semibold block leading-tight">
                          {appt.doctorName}
                        </span>
                        <span className="text-[10px] text-cyan-400 font-medium">
                          {appt.doctorSpecialty}
                        </span>
                      </div>
                      <Stethoscope className="w-4 h-4 text-slate-500" />
                    </div>

                    {appt.notes && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-900/40 p-1.5 rounded-md border border-slate-800/40">
                        "{appt.notes}"
                      </p>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                      {/* 1. Pending Actions */}
                      {appt.status === 'PENDING' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleStartSessionWithSound(appt)}
                            className="w-full py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition active:scale-95"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Qabulni Boshlash</span>
                          </button>

                          <button
                            onClick={() => onMarkNoShow(appt.id)}
                            className="w-full py-1.5 px-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Kelmadi</span>
                          </button>
                        </div>
                      )}

                      {/* 2. In Progress Actions */}
                      {appt.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => onCompleteSession(appt.id)}
                          className="w-full py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Qabulni Yakunlash</span>
                        </button>
                      )}

                      {/* 3. Takeover Chat Button (Active for all pending/in_progress/no-show) */}
                      <button
                        onClick={() => onTakeoverChat(appt)}
                        className="w-full py-1.5 px-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Chatni Qo'lga Olish</span>
                        {appt.aiPaused && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="AI To'xtatilgan" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
