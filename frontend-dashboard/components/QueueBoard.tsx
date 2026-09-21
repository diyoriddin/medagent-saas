'use client';

import React from 'react';
import AppointmentCard from './AppointmentCard';

interface QueueBoardProps {
  pending: any[];
  in_progress: any[];
  completed: any[];
  no_show: any[];
  onRefresh: () => void;
}

export default function QueueBoard({
  pending,
  in_progress,
  completed,
  no_show,
  onRefresh,
}: QueueBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Kutilmoqda (Pending) */}
      <div className="kanban-column">
        <div className="sticky top-0 bg-gray-50 pb-3 mb-3 border-b-2 border-yellow-400">
          <h2 className="text-lg font-semibold text-yellow-900">
            ⏳ Kutilmoqda ({pending.length})
          </h2>
        </div>
        <div className="space-y-3">
          {pending.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              status="pending"
              onActionComplete={onRefresh}
            />
          ))}
          {pending.length === 0 && (
            <p className="text-gray-400 text-center py-8">Bo'sh</p>
          )}
        </div>
      </div>

      {/* Qabulda (In Progress) */}
      <div className="kanban-column">
        <div className="sticky top-0 bg-gray-50 pb-3 mb-3 border-b-2 border-blue-400">
          <h2 className="text-lg font-semibold text-blue-900">
            🏥 Qabulda ({in_progress.length})
          </h2>
        </div>
        <div className="space-y-3">
          {in_progress.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              status="in_progress"
              onActionComplete={onRefresh}
            />
          ))}
          {in_progress.length === 0 && (
            <p className="text-gray-400 text-center py-8">Bo'sh</p>
          )}
        </div>
      </div>

      {/* Bajarildi (Completed) */}
      <div className="kanban-column">
        <div className="sticky top-0 bg-gray-50 pb-3 mb-3 border-b-2 border-green-400">
          <h2 className="text-lg font-semibold text-green-900">
            ✅ Bajarildi ({completed.length})
          </h2>
        </div>
        <div className="space-y-3">
          {completed.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              status="completed"
              onActionComplete={onRefresh}
            />
          ))}
          {completed.length === 0 && (
            <p className="text-gray-400 text-center py-8">Bo'sh</p>
          )}
        </div>
      </div>

      {/* Kelmadi (No Show) */}
      <div className="kanban-column">
        <div className="sticky top-0 bg-gray-50 pb-3 mb-3 border-b-2 border-red-400">
          <h2 className="text-lg font-semibold text-red-900">
            ❌ Kelmadi ({no_show.length})
          </h2>
        </div>
        <div className="space-y-3">
          {no_show.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              status="no_show"
              onActionComplete={onRefresh}
            />
          ))}
          {no_show.length === 0 && (
            <p className="text-gray-400 text-center py-8">Bo'sh</p>
          )}
        </div>
      </div>
    </div>
  );
}
