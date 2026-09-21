import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, Calendar as CalendarIcon, BellRing } from 'lucide-react';
import { Doctor, TimeSlot } from '../types';
import { apiService } from '../services/api';
import { triggerHaptic } from '../services/telegram';

interface SlotPickerProps {
  doctor: Doctor;
  onBack: () => void;
  onSlotSelected: (slot: TimeSlot) => void;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  doctor,
  onBack,
  onSlotSelected,
}) => {
  // Generate next 7 days for horizontal picker
  const [dates, setDates] = useState<{ label: string; subLabel: string; dateStr: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [waitingListAlert, setWaitingListAlert] = useState<string | null>(null);

  useEffect(() => {
    const days: { label: string; subLabel: string; dateStr: string }[] = [];
    const weekdaysUz = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      let label = `${day}.${month}`;
      let subLabel = weekdaysUz[d.getDay()];
      if (i === 0) subLabel = 'Bugun';
      if (i === 1) subLabel = 'Ertaga';

      days.push({ label, subLabel, dateStr });
    }

    setDates(days);
    if (days.length > 0) {
      setSelectedDate(days[0].dateStr);
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    loadSlots(selectedDate);
  }, [selectedDate, doctor.id]);

  const loadSlots = async (dateStr: string) => {
    setLoading(true);
    try {
      const data = await apiService.getDoctorSlots(doctor.id, dateStr);
      setSlots(data);
    } catch (e) {
      console.error('Failed to load slots', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.status === 'BOOKED') {
      triggerHaptic('error');
      return;
    }

    if (slot.status === 'WAITING_LIST') {
      triggerHaptic('warning');
      setWaitingListAlert(slot.time);
      return;
    }

    // Available slot
    triggerHaptic('selection');
    onSlotSelected(slot);
  };

  const availableCount = slots.filter((s) => s.status === 'AVAILABLE').length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between shadow-xs">
        <button
          onClick={() => {
            triggerHaptic('light');
            onBack();
          }}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs font-semibold py-1 px-2 rounded-lg bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Shifokorlar</span>
        </button>

        <span className="text-xs font-semibold text-slate-900">
          Vaqt Tanlash
        </span>

        <div className="w-12" />
      </div>

      {/* Selected Doctor Summary */}
      <div className="bg-white p-4 mx-4 mt-3 rounded-2xl border border-slate-100 flex items-center gap-3 shadow-xs">
        <img
          src={doctor.imageUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100'}
          alt={doctor.fullName}
          className="w-12 h-12 rounded-xl object-cover border border-slate-100"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 text-sm truncate">
            {doctor.fullName}
          </h4>
          <p className="text-xs text-sky-600 font-medium">{doctor.specialty}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-medium">Davomiylik</span>
          <span className="text-xs font-bold text-slate-700">{doctor.durationMin} daq</span>
        </div>
      </div>

      {/* Horizontal Date Selector */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
            Qabul kunini tanlang
          </span>
          <span className="text-[11px] text-slate-500">
            {availableCount} ta bo'sh vaqt
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {dates.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <button
                key={d.dateStr}
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedDate(d.dateStr);
                }}
                className={`shrink-0 flex flex-col items-center py-2.5 px-3.5 rounded-2xl transition active:scale-95 text-center min-w-[62px] border ${
                  isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-200'
                    : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200'
                }`}
              >
                <span className={`text-[11px] font-medium ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                  {d.subLabel}
                </span>
                <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-xl p-2.5 border border-slate-100 flex items-center justify-around text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span className="text-slate-600 font-medium">Bo'sh (Yashil)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="text-slate-400 font-medium">Band (Kulrang)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs" />
            <span className="text-slate-600 font-medium">Kutish ro'yxati</span>
          </div>
        </div>
      </div>

      {/* Interactive Time Slots Grid */}
      <div className="px-4 mt-4 flex-1">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Mavjud soatlar
          </span>
          <span className="text-[10px] text-slate-400">
            Tanlansa 180 soniya saqlanadi
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2.5 py-6 animate-pulse">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200/70 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {slots.map((slot) => {
              const isAvailable = slot.status === 'AVAILABLE';
              const isBooked = slot.status === 'BOOKED';
              const isHeld = slot.status === 'HELD';
              const isWaiting = slot.status === 'WAITING_LIST';

              return (
                <button
                  key={slot.id}
                  disabled={isBooked || isHeld}
                  onClick={() => handleSlotClick(slot)}
                  className={`py-3 px-2 rounded-xl text-center font-bold text-xs transition active:scale-95 border flex flex-col items-center justify-center relative overflow-hidden ${
                    isAvailable
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                      : isWaiting
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                      : isHeld
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <span className="text-sm">{slot.time}</span>
                  <span className="text-[9px] font-medium opacity-80 mt-0.5">
                    {isAvailable && "Bo'sh"}
                    {isWaiting && "Kutish"}
                    {isHeld && "Band qilinmoqda"}
                    {isBooked && "Band"}
                  </span>

                  {isWaiting && (
                    <BellRing className="w-3 h-3 text-amber-600 absolute top-1 right-1 opacity-70" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Waiting List Notification Popup */}
      {waitingListAlert && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <BellRing className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-slate-900 text-base">
              Kutish ro'yxatiga yozilish
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1.5 leading-relaxed">
              Soat <span className="font-bold text-slate-900">{waitingListAlert}</span> dagi qabul hozircha to'la. Agar boshqa bemor navbatni bekor qilsa, bot orqali sizga birinchi bo'lib taklif yuboramiz.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setWaitingListAlert(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  triggerHaptic('success');
                  alert(`Siz soat ${waitingListAlert} uchun kutish ro'yxatiga qo'shildingiz!`);
                  setWaitingListAlert(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition"
              >
                Xabar ber
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
