import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Coffee,
  AlertTriangle,
  CheckCircle,
  Save,
  Plus,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { DoctorSchedule } from '../types';
import { initialDoctorSchedules } from '../data/mockDashboardData';

interface ScheduleManagerProps {
  onTriggerEmergencyBlock: (doctorName: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  onTriggerEmergencyBlock,
}) => {
  const [schedules, setSchedules] = useState<DoctorSchedule[]>(initialDoctorSchedules);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('doc-001');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleToggleWorking = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isWorking: !s.isWorking } : s))
    );
  };

  const handleChangeTime = (id: string, field: keyof DoctorSchedule, val: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Shifokorlar Grafigi & Ish Soatlari
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Haftalik ish vaqti, tushlik tanaffusi va favqulodda bloklash boshqaruvi
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Emergency Block Button */}
          <button
            onClick={() => onTriggerEmergencyBlock('Dr. Jasur Alimov')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-bold transition active:scale-95 shadow-md shadow-rose-950/40"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Favqulodda Bloklash (Emergency)</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-cyan-500/20"
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-950" />
                <span>Saqlandi!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>O'zgarishlarni Saqlash</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Doctor Filter Selector */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
            JA
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              Dr. Jasur Alimov
            </h3>
            <span className="text-xs text-cyan-400 font-medium">
              Kardiologiya Bo'limi • Narxi: 180,000 so'm
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span>Faol Qabulda</span>
        </div>
      </div>

      {/* Weekly Grid (Dushanba - Yakshanba) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-900 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-200">
            Haftalik Ish Tartibi va Tushlik Vaqti
          </h3>
        </div>

        <div className="divide-y divide-slate-800/80">
          {schedules.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                item.isWorking ? 'bg-slate-900/30' : 'bg-slate-950/60 opacity-60'
              }`}
            >
              {/* Day Name & Toggle */}
              <div className="flex items-center gap-3 w-48">
                <input
                  type="checkbox"
                  checked={item.isWorking}
                  onChange={() => handleToggleWorking(item.id)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <span className={`text-sm font-bold ${item.isWorking ? 'text-white' : 'text-slate-500 line-through'}`}>
                  {item.dayName}
                </span>
                {!item.isWorking && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                    Dam olish
                  </span>
                )}
              </div>

              {/* Working Hours */}
              {item.isWorking && (
                <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
                  {/* Start & End */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-400">Ish vaqti:</span>
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => handleChangeTime(item.id, 'startTime', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    />
                    <span>—</span>
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => handleChangeTime(item.id, 'endTime', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  {/* Break Hours */}
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-400">Tanaffus:</span>
                    <input
                      type="time"
                      value={item.breakStart}
                      onChange={(e) => handleChangeTime(item.id, 'breakStart', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    />
                    <span>—</span>
                    <input
                      type="time"
                      value={item.breakEnd}
                      onChange={(e) => handleChangeTime(item.id, 'breakEnd', e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
