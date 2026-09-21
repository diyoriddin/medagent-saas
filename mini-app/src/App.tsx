import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ShieldCheck,
  Globe2,
} from 'lucide-react';
import { Header } from './components/Header';
import { DoctorCard } from './components/DoctorCard';
import { SlotPicker } from './components/SlotPicker';
import { CheckoutModal } from './components/CheckoutModal';
import { MyAppointmentsModal } from './components/MyAppointmentsModal';
import { EmergencyModal } from './components/EmergencyModal';
import { Doctor, TimeSlot, Appointment } from './types';
import { mockClinic, specialtiesList } from './data/mockData';
import { apiService } from './services/api';
import { initTelegramApp, triggerHaptic, getTelegramUser } from './services/telegram';

export const App: React.FC = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [specialty, setSpecialty] = useState<string>('Barchasi');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<'uz' | 'ru'>('uz');
  const [telegramName, setTelegramName] = useState('Do’st');

  // Modals
  const [showAppointments, setShowAppointments] = useState<boolean>(false);
  const [showEmergency, setShowEmergency] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    initTelegramApp();
    const tgUser = getTelegramUser();
    if (tgUser?.first_name) {
      setTelegramName(tgUser.first_name);
    }

    const savedLang = localStorage.getItem('medagent-language');
    if (savedLang === 'ru' || savedLang === 'uz') {
      setLanguage(savedLang);
    }

    loadDoctors();
    loadAppointments();
  }, []);

  useEffect(() => {
    localStorage.setItem('medagent-language', language);
  }, [language]);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDoctors();
      setDoctors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const data = await apiService.getMyAppointments();
      setAppointments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const text = {
    uz: {
      title: 'Salomatlikni bir bosqichda boshqaring',
      subtitle: 'Tez, qulay va ishonchli qabul.',
      language: 'Til',
      action: 'Navbatga yozilish',
      repeat: 'Takroriy tashrif',
      reminder: 'SMS eslatma',
      secure: 'Xavfsiz qabul',
      doctors: 'Shifokorlar',
      search: 'Shifokor ismi yoki mutaxassislik...',
      noResults: 'Hech qanday shifokor topilmadi',
      quick: 'Zero-form onboarding',
    },
    ru: {
      title: 'Заботимся о здоровье без лишних шагов',
      subtitle: 'Быстрая и удобная запись к врачу.',
      language: 'Язык',
      action: 'Записаться',
      repeat: 'Повторный визит',
      reminder: 'SMS напоминание',
      secure: 'Безопасная запись',
      doctors: 'Врачи',
      search: 'Поиск врача или специальности...',
      noResults: 'Врачей не найдено',
      quick: 'Автозаполнение из Telegram',
    },
  }[language];

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpecialty =
      specialty === 'Barchasi' || specialty === 'Все' || doc.specialty.toLowerCase() === specialty.toLowerCase();
    const matchesQuery =
      doc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpecialty && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative shadow-xl">
      <Header
        clinic={mockClinic}
        appointmentsCount={appointments.filter((a) => a.status === 'CONFIRMED').length}
        onOpenAppointments={() => setShowAppointments(true)}
        onOpenEmergency={() => setShowEmergency(true)}
      />

      {selectedDoctor ? (
        <SlotPicker
          doctor={selectedDoctor}
          onBack={() => {
            setSelectedDoctor(null);
            setSelectedSlot(null);
          }}
          onSlotSelected={(slot) => {
            setSelectedSlot(slot);
          }}
        />
      ) : (
        <main className="flex-1 px-4 py-3 space-y-3 pb-16">
          <div className="rounded-[28px] bg-gradient-to-br from-sky-600 via-cyan-500 to-teal-500 text-white p-4 shadow-lg shadow-cyan-600/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_35%)]" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
                  <Sparkles className="w-3 h-3" /> {text.quick}
                </span>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2 py-1 text-[10px] font-semibold">
                  <Globe2 className="w-3 h-3" />
                  <span>{text.language}</span>
                </div>
              </div>

              <h2 className="mt-3 text-xl font-black leading-tight">{telegramName}, {text.title}</h2>
              <p className="mt-1 text-xs text-sky-100 max-w-[240px]">{text.subtitle}</p>

              <div className="mt-3 flex gap-2">
                {(['uz', 'ru'] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      triggerHaptic('selection');
                      setLanguage(item);
                    }}
                    className={`flex-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold transition ${
                      language === item
                        ? 'bg-white text-sky-600 border-white shadow-sm'
                        : 'bg-white/10 text-white border-white/20'
                    }`}
                  >
                    {item === 'uz' ? 'O’zbek' : 'Русский'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: text.repeat, value: '72%' },
              { label: text.reminder, value: '24h' },
              { label: text.secure, value: 'SSL' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{stat.label}</div>
                <div className="mt-2 text-base font-black text-slate-800">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={text.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
            {specialtiesList.map((spec) => {
              const active = specialty === spec || (spec === 'Barchasi' && specialty === 'Barchasi');
              return (
                <button
                  key={spec}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSpecialty(spec);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {spec}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 px-1">
              <span>{text.doctors} ({filteredDoctors.length})</span>
              <span className="inline-flex items-center gap-1 text-sky-600">
                <ShieldCheck className="w-3.5 h-3.5" /> Premium
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100" />
                ))}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500">{text.noResults}</p>
              </div>
            ) : (
              filteredDoctors.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  onSelect={(d) => setSelectedDoctor(d)}
                />
              ))
            )}
          </div>
        </main>
      )}

      {selectedDoctor && selectedSlot && (
        <CheckoutModal
          clinic={mockClinic}
          doctor={selectedDoctor}
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSuccess={() => {
            loadAppointments();
          }}
        />
      )}

      {showAppointments && (
        <MyAppointmentsModal
          appointments={appointments}
          onClose={() => setShowAppointments(false)}
          onRefresh={loadAppointments}
        />
      )}

      {showEmergency && (
        <EmergencyModal
          clinic={mockClinic}
          onClose={() => setShowEmergency(false)}
        />
      )}
    </div>
  );
};

export default App;
