import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle, Ban } from 'lucide-react';
import { Appointment } from '../types';
import { apiService } from '../services/api';
import { triggerHaptic } from '../services/telegram';

interface MyAppointmentsModalProps {
  appointments: Appointment[];
  onClose: () => void;
  onRefresh: () => void;
}

export const MyAppointmentsModal: React.FC<MyAppointmentsModalProps> = ({
  appointments,
  onClose,
  onRefresh,
}) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Haqiqatdan ham navbatni bekor qilmoqchimisiz?')) {
      return;
    }

    triggerHaptic('warning');
    setCancellingId(id);

    try {
      await apiService.cancelAppointment(id);
      triggerHaptic('success');
      onRefresh();
    } catch (e) {
      triggerHaptic('error');
      alert('Bekor qilishda xatolik yuz berdi');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Tasdiqlangan
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" /> Qabulda
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
            Bajarildi
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
            <Ban className="w-3 h-3" /> Bekor qilingan
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
            Kelmadi
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Mening Navbatlarim
            </h3>
            <p className="text-xs text-slate-500">
              Faol va oldingi yozilishlar
            </p>
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

        {/* List of appointments */}
        <div className="overflow-y-auto py-3 space-y-3 flex-1">
          {appointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Sizda hali faol navbatlar yo'q</p>
            </div>
          ) : (
            appointments.map((apt) => {
              const isCancelled = apt.status === 'CANCELLED';
              return (
                <div
                  key={apt.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    isCancelled
                      ? 'bg-slate-50/70 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200/80 shadow-xs hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {apt.doctorName}
                      </h4>
                      <p className="text-xs text-sky-600 font-medium">
                        {apt.doctorSpecialty}
                      </p>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-sky-600" />
                      <span>{apt.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>{apt.startTime} - {apt.endTime}</span>
                    </div>
                  </div>

                  {/* Actions for confirmed appointments */}
                  {!isCancelled && apt.status === 'CONFIRMED' && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-400">
                        {apt.qrCode}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={cancellingId === apt.id}
                          onClick={() => handleCancel(apt.id)}
                          className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition"
                        >
                          {cancellingId === apt.id ? 'Bekor qilinmoqda...' : 'Bekor qilish'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
