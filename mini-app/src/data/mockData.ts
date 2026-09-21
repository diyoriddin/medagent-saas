import { Clinic, Doctor, TimeSlot, Appointment } from '../types';

export const mockClinic: Clinic = {
  id: 'clinic-medlife-001',
  name: 'MedLife Shifo Markazi',
  slug: 'medlife',
  phone: '+998 71 200 40 40',
  emergencyPhone: '+998 71 200 99 99',
  address: 'Toshkent sh., Amir Temur shox ko\'chasi, 107-B',
  city: 'Toshkent',
  logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=120&auto=format&fit=crop&q=80',
};

export const mockDoctors: Doctor[] = [
  {
    id: 'doc-001',
    clinicId: 'clinic-medlife-001',
    fullName: 'Dr. Jasur Alimov',
    specialty: 'Kardiolog',
    price: 180000,
    durationMin: 30,
    experienceYears: 12,
    rating: 4.9,
    reviewsCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80',
    bio: 'Yurak-qon tomir kasalliklari bo\'yicha oliy toifali mutaxassis. Germaniya va Turkiyada malaka oshirgan.',
    isActive: true,
  },
  {
    id: 'doc-002',
    clinicId: 'clinic-medlife-001',
    fullName: 'Dr. Nigora Rahimova',
    specialty: 'Pediatr',
    price: 150000,
    durationMin: 30,
    experienceYears: 9,
    rating: 4.8,
    reviewsCount: 98,
    imageUrl: 'https://images.unsplash.com/photo-1594824813580-c0490b411d33?w=300&auto=format&fit=crop&q=80',
    bio: 'Bolalar salomatligi, profilaktik ko\'rik va erta tashxis qo\'yish bo\'yicha mutaxassis.',
    isActive: true,
  },
  {
    id: 'doc-003',
    clinicId: 'clinic-medlife-001',
    fullName: 'Dr. Farrux Ergashev',
    specialty: 'Nevropatolog',
    price: 200000,
    durationMin: 40,
    experienceYears: 15,
    rating: 5.0,
    reviewsCount: 215,
    imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80',
    bio: 'Bosh og\'rig\'i, uyqusizlik va asab tizimi buzilishlarini zamonaviy diagnostika bilan davolash.',
    isActive: true,
  },
  {
    id: 'doc-004',
    clinicId: 'clinic-medlife-001',
    fullName: 'Dr. Madina Karimova',
    specialty: 'Oftalmolog',
    price: 160000,
    durationMin: 30,
    experienceYears: 8,
    rating: 4.7,
    reviewsCount: 76,
    imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80',
    bio: 'Ko\'z bosimi, ko\'rish qobiliyatini tekshirish va apparatli davolash bo\'yicha mutaxassis.',
    isActive: true,
  },
  {
    id: 'doc-005',
    clinicId: 'clinic-medlife-001',
    fullName: 'Dr. Sherzod Mirzayev',
    specialty: 'Stomatolog',
    price: 190000,
    durationMin: 45,
    experienceYears: 11,
    rating: 4.9,
    reviewsCount: 164,
    imageUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&auto=format&fit=crop&q=80',
    bio: 'Tishlarni estetik davolash, restavratsiya va og\'riqsiz muolajalar.',
    isActive: true,
  }
];

export const specialtiesList = [
  'Barchasi',
  'Kardiolog',
  'Pediatr',
  'Nevropatolog',
  'Oftalmolog',
  'Stomatolog',
];

/**
 * Generate slots for a doctor and date
 */
export const generateSlotsForDate = (doctorId: string, dateStr: string): TimeSlot[] => {
  const times = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    // 12:00 - 13:00 tushlik
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  return times.map((t, idx) => {
    // Generate realistic distribution:
    // Slot 1 & 4 booked, Slot 7 waiting list, others available
    let status: TimeSlot['status'] = 'AVAILABLE';
    if (idx === 1 || idx === 3 || idx === 8) {
      status = 'BOOKED';
    } else if (idx === 5) {
      status = 'WAITING_LIST';
    }

    const [h, m] = t.split(':').map(Number);
    const endMinutes = m + 30;
    const endH = endMinutes >= 60 ? h + 1 : h;
    const endM = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    return {
      id: `slot-${doctorId}-${dateStr}-${t.replace(':', '')}`,
      doctorId,
      date: dateStr,
      time: t,
      endTime,
      status,
    };
  });
};

export const initialAppointments: Appointment[] = [
  {
    id: 'apt-771',
    clinicId: 'clinic-medlife-001',
    doctorId: 'doc-001',
    doctorName: 'Dr. Jasur Alimov',
    doctorSpecialty: 'Kardiolog',
    doctorPrice: 180000,
    patientName: 'Ali Valiyev',
    patientPhone: '+998 90 123 45 67',
    date: '2026-09-12',
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED',
    notes: 'Profilaktik ko\'rik va EKG tekshiruvi',
    qrCode: 'MED-771-ALIV',
    createdAt: '2026-09-11T14:30:00Z',
  }
];
