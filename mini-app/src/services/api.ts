import { Doctor, TimeSlot, Appointment } from '../types';
import { mockDoctors, generateSlotsForDate, initialAppointments } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// In-memory local state cache for instant response & offline fallback
let localAppointments: Appointment[] = [...initialAppointments];
const heldSlotsMemory: Map<string, { heldUntil: number; phone: string }> = new Map();

export const apiService = {
  /**
   * Get list of active doctors with optional specialty filter
   */
  async getDoctors(specialty?: string): Promise<Doctor[]> {
    try {
      const url = new URL(`${API_BASE_URL}/doctors`);
      if (specialty && specialty !== 'Barchasi') {
        url.searchParams.append('specialty', specialty);
      }
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback to mock data
    }

    if (!specialty || specialty === 'Barchasi') {
      return mockDoctors;
    }
    return mockDoctors.filter((d) => d.specialty.toLowerCase() === specialty.toLowerCase());
  },

  /**
   * Get available, held, and booked slots for a doctor on a specific date
   */
  async getDoctorSlots(doctorId: string, dateStr: string): Promise<TimeSlot[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors/${doctorId}/slots?date=${dateStr}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback to mock
    }

    // Generate slots and sync with memory held state
    const slots = generateSlotsForDate(doctorId, dateStr);
    const now = Date.now();

    return slots.map((slot) => {
      const held = heldSlotsMemory.get(slot.id);
      if (held && held.heldUntil > now) {
        return {
          ...slot,
          status: 'HELD',
          heldUntil: held.heldUntil,
          heldByPhone: held.phone,
        };
      }
      return slot;
    });
  },

  /**
   * Hold a slot for 180 seconds (Redlock mechanism)
   */
  async holdSlot(
    slotId: string,
    doctorId: string,
    patientPhone: string
  ): Promise<{ success: boolean; heldUntil: number; message: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, doctorId, patientPhone }),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback in-memory
    }

    const heldUntil = Date.now() + 180 * 1000;
    heldSlotsMemory.set(slotId, { heldUntil, phone: patientPhone });
    return {
      success: true,
      heldUntil,
      message: 'Slot 180 soniyaga band qilindi',
    };
  },

  /**
   * Final booking confirmation
   */
  async bookAppointment(data: {
    slotId: string;
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
    notes?: string;
  }): Promise<Appointment> {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const booked = await res.json();
        localAppointments.unshift(booked);
        return booked;
      }
    } catch (e) {
      // Fallback
    }

    // Clean up held slot
    heldSlotsMemory.delete(data.slotId);

    const newAppointment: Appointment = {
      id: `apt-${Date.now().toString().slice(-4)}`,
      clinicId: 'clinic-medlife-001',
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      doctorSpecialty: data.doctorSpecialty,
      doctorPrice: data.doctorPrice,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      telegramId: data.telegramId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      status: 'CONFIRMED',
      notes: data.notes,
      qrCode: `MED-${Date.now().toString().slice(-4)}-${data.patientName.slice(0, 3).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    localAppointments.unshift(newAppointment);
    return newAppointment;
  },

  /**
   * Get patient appointments
   */
  async getMyAppointments(phone?: string): Promise<Appointment[]> {
    if (phone) {
      return localAppointments.filter((a) => a.patientPhone === phone);
    }
    return localAppointments;
  },

  /**
   * Cancel appointment
   */
  async cancelAppointment(id: string): Promise<boolean> {
    localAppointments = localAppointments.map((apt) =>
      apt.id === id ? { ...apt, status: 'CANCELLED' } : apt
    );
    return true;
  },
};
