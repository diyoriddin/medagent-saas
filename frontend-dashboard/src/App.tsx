import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { LiveQueueKanban } from './components/LiveQueueKanban';
import { ScheduleManager } from './components/ScheduleManager';
import { AISettings } from './components/AISettings';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { ChatTakeoverModal } from './components/ChatTakeoverModal';
import { EmergencyBlockModal } from './components/EmergencyBlockModal';
import { PatientAppointment } from './types';
import { initialQueueAppointments } from './data/mockDashboardData';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'schedule' | 'ai' | 'analytics'>('queue');
  const [appointments, setAppointments] = useState<PatientAppointment[]>(initialQueueAppointments);

  // Modals
  const [selectedChatAppt, setSelectedChatAppt] = useState<PatientAppointment | null>(null);
  const [emergencyDoctor, setEmergencyDoctor] = useState<string | null>(null);

  // Status transitions
  const handleStartSession = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'IN_PROGRESS' } : a))
    );
  };

  const handleMarkNoShow = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'NO_SHOW' } : a))
    );
  };

  const handleCompleteSession = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'COMPLETED' } : a))
    );
  };

  const handleToggleAi = (apptId: string, paused: boolean) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === apptId ? { ...a, aiPaused: paused } : a))
    );
  };

  const handleEmergencyBlock = (date: string, reason: string) => {
    // Mass-cancel doctor appointments for that date
    setAppointments((prev) =>
      prev.map((a) => (a.date === date ? { ...a, status: 'CANCELLED', notes: `Bekor qilindi: ${reason}` } : a))
    );
  };

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeTab === 'queue' && (
          <LiveQueueKanban
            appointments={appointments}
            onStartSession={handleStartSession}
            onMarkNoShow={handleMarkNoShow}
            onTakeoverChat={(appt) => setSelectedChatAppt(appt)}
            onCompleteSession={handleCompleteSession}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleManager
            onTriggerEmergencyBlock={(doctorName) => setEmergencyDoctor(doctorName)}
          />
        )}

        {activeTab === 'ai' && <AISettings />}
        {activeTab === 'analytics' && <AnalyticsOverview />}
      </main>

      {/* Chat Takeover Modal */}
      {selectedChatAppt && (
        <ChatTakeoverModal
          appointment={selectedChatAppt}
          onClose={() => setSelectedChatAppt(null)}
          onToggleAi={handleToggleAi}
        />
      )}

      {/* Emergency Block Modal */}
      {emergencyDoctor && (
        <EmergencyBlockModal
          doctorName={emergencyDoctor}
          onClose={() => setEmergencyDoctor(null)}
          onConfirm={handleEmergencyBlock}
        />
      )}
    </div>
  );
};

export default App;
