import React from 'react';
import { X, PhoneCall, ShieldAlert } from 'lucide-react';
import { Clinic } from '../types';
import { triggerHaptic } from '../services/telegram';

interface EmergencyModalProps {
  clinic: Clinic;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ clinic, onClose }) => {
  const phone = clinic.emergencyPhone || clinic.phone;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-slate-900 text-base">
              Tezkor va Shoshilinch Yordam
            </h3>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 p-4 bg-rose-50/80 border border-rose-200/80 rounded-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-rose-200 animate-pulse">
            <PhoneCall className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-rose-900 text-sm">
            Klinika Call-Markazi va Reanimatsiya
          </h4>
          <p className="text-xs text-rose-700/90 mt-1 leading-relaxed">
            Agar bemorning ahvoli o'ta og'ir bo'lsa yoki zudlik bilan shifokor maslahati kerak bo'lsa, ushbu raqamga qo'ng'iroq qiling:
          </p>

          <div className="mt-3 font-mono font-bold text-lg text-slate-900 bg-white py-2 px-4 rounded-xl border border-rose-200 inline-block shadow-xs">
            {phone}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            onClick={() => triggerHaptic('heavy')}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition active:scale-98"
          >
            <PhoneCall className="w-4 h-4" />
            <span>To'g'ridan-to'g'ri Qo'ng'iroq Qilish</span>
          </a>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-full py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Orqaga qaytish
          </button>
        </div>
      </div>
    </div>
  );
};
