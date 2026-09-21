'use client';

import React from 'react';

interface AnalyticsDashboardProps {
  queue: any;
}

export default function AnalyticsDashboard({ queue }: AnalyticsDashboardProps) {
  const total = queue.total || 0;
  const completed = queue.completed?.length || 0;
  const no_show = queue.no_show?.length || 0;
  const remaining = queue.pending?.length + queue.in_progress?.length || 0;

  const noShowRate = total > 0 ? ((no_show / total) * 100).toFixed(1) : '0';
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Appointments */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Jami Navbatlar</p>
          <p className="text-4xl font-bold text-gray-900">{total}</p>
        </div>
      </div>

      {/* Completed */}
      <div className="bg-green-50 rounded-lg shadow p-6 border-t-4 border-green-400">
        <div className="text-center">
          <p className="text-green-600 text-sm">Tugatilgan</p>
          <p className="text-4xl font-bold text-green-700">{completed}</p>
          <p className="text-sm text-green-600 mt-1">{completionRate}%</p>
        </div>
      </div>

      {/* Remaining */}
      <div className="bg-blue-50 rounded-lg shadow p-6 border-t-4 border-blue-400">
        <div className="text-center">
          <p className="text-blue-600 text-sm">Qilinishi Kerak</p>
          <p className="text-4xl font-bold text-blue-700">{remaining}</p>
        </div>
      </div>

      {/* No-Show Rate */}
      <div className="bg-red-50 rounded-lg shadow p-6 border-t-4 border-red-400">
        <div className="text-center">
          <p className="text-red-600 text-sm">Kelmadi</p>
          <p className="text-4xl font-bold text-red-700">{no_show}</p>
          <p className="text-sm text-red-600 mt-1">{noShowRate}%</p>
        </div>
      </div>
    </div>
  );
}
