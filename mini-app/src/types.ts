export type Role = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'RECEPTIONIST' | 'DOCTOR';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type SlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'WAITING_LIST';

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  phone: string;
  emergencyPhone?: string;
  address?: string;
  city?: string;
  logoUrl?: string;
}

export interface Doctor {
  id: string;
  clinicId: string;
  fullName: string;
  specialty: string;
  price: number;
  durationMin: number;
  experienceYears?: number;
  rating?: number;
  reviewsCount?: number;
  imageUrl?: string;
  bio?: string;
  isActive: boolean;
}

export interface TimeSlot {
  id: string;
  doctorId: string;
  time: string;       // "09:00"
  endTime: string;    // "09:30"
  date: string;       // "2026-09-12"
  status: SlotStatus;
  heldUntil?: number; // timestamp ms
  heldByPhone?: string;
}

export interface Appointment {
  id: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorPrice: number;
  patientName: string;
  patientPhone: string;
  telegramId?: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  qrCode?: string;
  createdAt: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  phone_number?: string;
}
