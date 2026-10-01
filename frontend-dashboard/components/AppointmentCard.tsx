 'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface AppointmentCardProps {
  appointment: any;
  status: 'pending' | 'in_progress' | 'completed' | 'no_show';
  onActionComplete: () => void;
}

export default function AppointmentCard({
  appointment,
  status,
  onActionComplete,
}: AppointmentCardProps) {
  const [loading, setLoading] = useState(false);

  const getStatusBadgeColor = () => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      no_show: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status];
  };

  const getStatusLabel = () => {
    const labels = {
      pending: '⏳ Kutilmoqda',
      in_progress: '🏥 Qabulda',
      completed: '✅ Bajarildi',
      no_show: '❌ Kelmadi',
    };
    return labels[status];
  };

  async function handleAction(action: string) {
    setLoading(true);
    try {
      const endpoint = `/admin/queue/${appointment.id}/${action === 'start' ? 'start' : action}`;
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: action === 'no-show' ? JSON.stringify({ reason: 'Bemor kelmadi' }) : undefined,
      });

      if (!response.ok) throw new Error('Action failed');

      toast.success(`✅ ${action === 'start' ? 'Qabul boshlandi' : 'Amal bajarildi'}`);
      onActionComplete();
    } catch (error) {
      toast.error('❌ Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`kanban-card border-l-4 ${getStatusBadgeColor()}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-gray-900">{appointment.patient?.firstName}</p>
          <p className="text-sm text-gray-600">
            👨‍⚕️ {appointment.doctor?.fullName}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusBadgeColor()}`}>
          {getStatusLabel()}
        </span>
      </div>

      {/* Time & Details */}
      <div className="text-sm text-gray-600 mb-3 space-y-1">
        <p>🕐 {new Date(appointment.startTime).toLocaleTimeString('uz-UZ')}</p>
        <p>📞 {appointment.patient?.phone}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t">
        {status === 'pending' && (
          <>
            <button
              onClick={() => handleAction('start')}
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-2 px-2 rounded transition"
            >
              ▶️ Boshlash
            </button>
            <button
              onClick={() => handleAction('cancel')}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 px-2 rounded transition"
            >
              ❌ Bekor
            </button>
          </>
        )}

        {status === 'in_progress' && (
          <>
            <button
              onClick={() => handleAction('no-show')}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 px-2 rounded transition"
            >
              ❌ No-Show
            </button>
            <button
              onClick={() => handleAction('takeover')}
              disabled={loading}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold py-2 px-2 rounded transition"
            >
              💬 Chat
            </button>
          </>
        )}

        {status === 'completed' && (
          <p className="text-center text-green-600 font-semibold text-xs py-2">✅ Tugatildi</p>
        )}

        {status === 'no_show' && (
          <p className="text-center text-red-600 font-semibold text-xs py-2">⚠️ Kelmadi</p>
        )}
      </div>
    </div>
  );
}
