import React from 'react';
import { Clock, Award, Calendar, ChevronRight } from 'lucide-react';
import { Doctor } from '../types';
import { triggerHaptic } from '../services/telegram';

interface DoctorCardProps {
  doctor: Doctor;
  onSelect: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onSelect }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100/80 hover:border-sky-200 transition duration-200 hover:shadow-md flex flex-col justify-between">
      <div className="flex gap-3.5">
        {/* Doctor Avatar */}
        <div className="relative shrink-0">
          <img
            src={doctor.imageUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
            alt={doctor.fullName}
            className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shadow-inner"
          />
          <span className="absolute -bottom-1 -right-1 bg-white px-1.5 py-0.5 rounded-full shadow-xs text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5 border border-emerald-100">
            ★ {doctor.rating || 4.9}
          </span>
        </div>

        {/* Doctor Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
              {doctor.fullName}
            </h3>
          </div>
          <p className="text-xs font-medium text-sky-600 mt-0.5">
            {doctor.specialty}
          </p>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{doctor.experienceYears || 10} yil tajriba</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{doctor.durationMin} daqiqa</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {doctor.bio}
          </p>
        </div>
      </div>

      {/* Footer: Price & Booking Action */}
      <div className="mt-3.5 pt-3 border-t border-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
            Ko'rik narxi
          </span>
          <span className="text-sm font-bold text-slate-900">
            {formatPrice(doctor.price)}
          </span>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            onSelect(doctor);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white text-xs font-semibold shadow-xs shadow-sky-200 transition active:scale-95"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Vaqtni tanlash</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>
    </div>
  );
};
