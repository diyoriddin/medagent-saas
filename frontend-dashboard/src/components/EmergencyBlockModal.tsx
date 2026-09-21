import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, Send, Calendar, CheckCircle2 } from 'lucide-react';

interface EmergencyBlockModalProps {
  doctorName: string;
  onClose: () => void;
  onConfirm: (date: string, reason: string) => void;
}

export const EmergencyBlockModal: React.FC<EmergencyBlockModalProps> = ({
  doctorName,
  onClose,
  onConfirm,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-12');
  const [reason, setReason] = useState<string>('Shifokorning to\'satdan betob bo\'lib qolishi tufayli');
  const [isDone, setIsDone] = useState<boolean>(false);
  const [affectedCount, setAffectedCount] = useState<number>(6);

  const handleExecute = () => {
    onConfirm(selectedDate, reason);
    setIsDone(true);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">
              Favqulodda Bloklash (Emergency Block)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isDone ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-white text-base">
              Favqulodda bekor qilish muvaffaqiyatli bajarildi!
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Ushbu kundagi {affectedCount} nafar bemorning navbati bekor qilindi va Telegram bot orqali qayta yozilish taklifi yuborildi.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
            >
              Yopish
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-200">
                  Diqqat: Bir klik bilan barcha navbatlar bekor qilinadi!
                </span>
                <span>
                  {doctorName} ning tanlangan kundagi barcha bemorlariga Telegram bot orqali avtomatik ravishda boshqa kunga ko'chirish tugmasi bor xabar boradi.
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Bloklanadigan sana:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Bemorlarga yuboriladigan sabab (Telegram xabari):
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="pt-2 flex gap-2.5">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Bekor qilish
              </button>

              <button
                onClick={handleExecute}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/50 active:scale-95"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Bloklash & Xabar Yuborish</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
