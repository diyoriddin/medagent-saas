export type AppointmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

export interface PatientAppointment {
  id: string;
  ticketNumber: string; // e.g. "A-102"
  patientName: string;
  patientPhone: string;
  telegramId?: number;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  aiPaused?: boolean;
  createdAt: string;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  dayOfWeek: number; // 1 (Mon) to 7 (Sun)
  dayName: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  isWorking: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'PATIENT' | 'AI' | 'AGENT';
  text: string;
  timestamp: string;
}

export interface AIConfiguration {
  clinicId: string;
  systemPrompt: string;
  welcomeMsg: string;
  language: string;
  modelName: string;
  strictMode: boolean;
  temperature: number;
}
