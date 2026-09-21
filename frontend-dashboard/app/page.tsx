'use client';

import { useEffect, useState } from 'react';
import QueueBoard from '../components/QueueBoard';
import AppointmentCard from '../components/AppointmentCard';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function Dashboard() {
  const [queue, setQueue] = useState({
    pending: [],
    in_progress: [],
    completed: [],
    no_show: [],
    total: 0,
    timestamp: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
    // Refresh every 5 seconds
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchQueue() {
    try {
      const response = await fetch(`${API_URL}/admin/queue`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch queue');

      const data = await response.json();
      setQueue(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching queue');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin">⏳ Yuklanimoqda...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900">📊 Live Navbat</h1>
          <p className="text-gray-600">Haqiqiy vaqt rejimidagi qabul paneli</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Analytics Summary */}
        <AnalyticsDashboard queue={queue} />

        {/* Kanban Board */}
        <div className="mt-8">
          <QueueBoard
            pending={queue.pending}
            in_progress={queue.in_progress}
            completed={queue.completed}
            no_show={queue.no_show}
            onRefresh={fetchQueue}
          />
        </div>
      </main>
    </div>
  );
}
