import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  Sparkles,
  Navigation,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Doctor, TimeSlot, Clinic, Appointment } from '../types';
import { HoldTimer } from './HoldTimer';
import { apiService } from '../services/api';
import { getTelegramUser, triggerHaptic } from '../services/telegram';

interface CheckoutModalProps {
  clinic: Clinic;
  doctor: Doctor;
  slot: TimeSlot;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  clinic,
  doctor,
  slot,
  onClose,
  onSuccess,
}) => {
  const tgUser = getTelegramUser();
  const defaultName = tgUser ? `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() : '';

  const [fullName, setFullName] = useState<string>(defaultName);
  const [phone, setPhone] = useState<string>('+998 ');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [confirmedAppt, setConfirmedAppt] = useState<Appointment | null>(null);

  const handleAutofill = () => {
    triggerHaptic('light');
    if (tgUser) {
      setFullName(`${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Ali Valiyev');
      setPhone('+998 90 123 45 67');
    } else {
      setFullName('Aziz Karimov');
      setPhone('+998 90 765 43 21');
    }
  };

  const handlePhoneChange = (val: string) => {
    if (!val.startsWith('+998')) {
      setPhone('+998 ');
      return;
    }
    setPhone(val);
  };

  const handleConfirm = async () => {
    if (!fullName.trim()) {
      triggerHaptic('error');
      setErrorMsg('Iltimos, ismingizni kiriting');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      triggerHaptic('error');
      setErrorMsg("Iltimos, to'liq telefon raqamini kiriting");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      const result = await apiService.bookAppointment({
        slotId: slot.id,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        doctorSpecialty: doctor.specialty,
        doctorPrice: doctor.price,
        patientName: fullName,
        patientPhone: phone,
        telegramId: tgUser?.id,
        date: slot.date,
        startTime: slot.time,
        endTime: slot.endTime,
        notes: notes.trim() || undefined,
      });

      triggerHaptic('success');
      setConfirmedAppt(result);
      onSuccess(result);
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  // If already confirmed, render congratulations and QR code view
  if (confirmedAppt) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h3 className="text-center font-bold text-slate-900 text-lg">
            Navbatingiz Tasdiqlandi!
          </h3>
          <p className="text-xs text-slate-500 text-center mt-1">
            Telegram bot orqali batafsil eslatma va eslatma havolasi yuborildi.
          </p>

          {/* QR Pass Card */}
          <div className="bg-gradient-to-br from-sky-50 to-teal-50 rounded-2xl p-4 border border-sky-100 mt-4 text-center">
            <div className="bg-white p-3 rounded-xl shadow-xs inline-block mx-auto mb-2">
              <QrCode className="w-24 h-24 text-slate-800" />
            </div>
            <div className="text-xs font-mono font-bold text-slate-700">
              Raqam: {confirmedAppt.qrCode}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Klinika qabulxonasida ushbu QR-kodni ko'rsatishingiz mumkin.
            </p>
          </div>

          {/* Location details */}
          <div className="mt-3.5 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-sky-600 shrink-0" />
            <div className="text-xs min-w-0 flex-1">
              <span className="font-semibold text-slate-900 block truncate">
                {clinic.name}
              </span>
              <span className="text-slate-500 block truncate">
                {clinic.address}
              </span>
            </div>
            <a
              href={`https://yandex.com/maps/?text=${encodeURIComponent(clinic.address || 'Tashkent')}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0"
            >
              <Navigation className="w-3 h-3" />
              Xarita
            </a>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-full mt-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Navbatni Tasdiqlash
            </h3>
            <p className="text-xs text-slate-500">
              Qabul ma'lumotlarini tekshiring
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

        {/* 180s Hold Timer Bar */}
        <div className="mt-3">
          <HoldTimer
            initialSeconds={180}
            onExpire={() => {
              setIsExpired(true);
              triggerHaptic('error');
            }}
          />
        </div>

        {isExpired && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              180 soniyalik vaqt tugadi. Iltimos, slotni qaytadan tanlang.
            </span>
          </div>
        )}

        {/* Appointment Card Summary */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-sm block">
                {doctor.fullName}
              </span>
              <span className="text-xs text-sky-600 font-medium">
                {doctor.specialty}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-900">
                {formatPrice(doctor.price)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>{slot.date}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>{slot.time} - {slot.endTime}</span>
            </div>
          </div>
        </div>

        {/* Telegram Autofill Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleAutofill}
            className="w-full py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200/80 text-sky-700 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Telegram kontakt orqali to'ldirish</span>
          </button>
        </div>

        {/* Patient Form */}
        <div className="mt-3.5 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Bemorning to'liq ismi *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Masalan: Ali Valiyev"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Telefon raqami *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Shikoyat yoki qo'shimcha izoh (ixtiyoriy)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shikoyatingizni qisqacha yozing..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition resize-none"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <p className="mt-2 text-xs font-medium text-rose-600">
            {errorMsg}
          </p>
        )}

        {/* Location Info */}
        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-[11px] text-slate-600">
          <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <span>Manzil: {clinic.address}</span>
        </div>

        {/* Confirm Button */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            disabled={isSubmitting || isExpired}
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-200 transition active:scale-98 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Tasdiqlanmoqda...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Navbatni Tasdiqlash</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
