import React from 'react';
import { CalendarCheck, ShieldAlert } from 'lucide-react';
import { Clinic } from '../types';
import { triggerHaptic } from '../services/telegram';

interface HeaderProps {
  clinic: Clinic;
  appointmentsCount: number;
  onOpenAppointments: () => void;
  onOpenEmergency: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  clinic,
  appointmentsCount,
  onOpenAppointments,
  onOpenEmergency,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between">
        {/* Clinic info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 p-0.5 shadow-sm">
            <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center font-bold text-sky-600 text-lg">
              +M
            </div>
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 text-sm leading-tight">
              {clinic.name}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Online navbat ochiq
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Mening Navbatlarim */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenAppointments();
            }}
            className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition active:scale-95 border border-slate-200/60"
            title="Mening navbatlarim"
          >
            <CalendarCheck className="w-5 h-5 text-sky-600" />
            {appointmentsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-sky-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {appointmentsCount}
              </span>
            )}
          </button>

          {/* Shoshilinch Yordam */}
          <button
            onClick={() => {
              triggerHaptic('warning');
              onOpenEmergency();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition active:scale-95 font-medium text-xs shadow-xs"
            title="Shoshilinch / Tezkor Yordam"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-bounce" />
            <span className="hidden sm:inline">Tezkor</span>
          </button>
        </div>
      </div>
    </header>
  );
};
