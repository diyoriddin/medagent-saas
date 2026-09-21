import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Bot,
  Users,
  Settings,
  LogOut,
  Hospital,
  Activity,
  Radio,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'queue' | 'schedule' | 'ai' | 'analytics';
  onSelectTab: (tab: 'queue' | 'schedule' | 'ai' | 'analytics') => void;
  pendingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
}) => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Logo & Clinic Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-cyan-500/20">
              +M
            </div>
            <div>
              <span className="font-black tracking-wide text-white text-base block leading-none">
                MedAgent
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                Clinic SaaS
              </span>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2.5">
            <Hospital className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-200 block truncate">
                MedLife Shifo Markazi
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Live Webhook Faol
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1.5">
          <button
            onClick={() => onSelectTab('queue')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'queue'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4" />
              <span>Live Queue (Navbat)</span>
            </div>
            {pendingCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  activeTab === 'queue'
                    ? 'bg-slate-950 text-cyan-300'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('schedule')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'schedule'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Shifokorlar Grafigi</span>
          </button>

          <button
            onClick={() => onSelectTab('ai')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'ai'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Bot & Prompt Sozlamalari</span>
          </button>

          <button
            onClick={() => onSelectTab('analytics')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'analytics'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics & Retention</span>
          </button>
        </nav>
      </div>

      {/* Footer: User profile & Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400">
              RX
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-200 block truncate">
                Ziyoda Q.
              </span>
              <span className="text-[10px] text-slate-400 block">
                Receptionist Admin
              </span>
            </div>
          </div>
          <button
            onClick={() => alert('Tizimdan chiqish tasdiqlandi')}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Chiqish"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
