import React from 'react';
import {
  BarChart3,
  BellRing,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';

export const AnalyticsOverview: React.FC = () => {
  const metrics = [
    { label: 'Bugungi bemorlar', value: '126', delta: '+18%', color: 'cyan', icon: Users },
    { label: 'Repeat visits', value: '72%', delta: '+9%', color: 'emerald', icon: TrendingUp },
    { label: 'No-show', value: '7.4%', delta: '-2.1%', color: 'amber', icon: BellRing },
    { label: 'Retention score', value: '89/100', delta: '+5%', color: 'violet', icon: ShieldCheck },
  ];

  const doctors = [
    { name: 'Dr. Jasur Alimov', score: 94, revenue: '₩ 9.8M', repeat: '81%' },
    { name: 'Dr. Nargiza Karimova', score: 91, revenue: '₩ 8.3M', repeat: '79%' },
    { name: 'Dr. Dilshod Rakhimov', score: 86, revenue: '₩ 7.5M', repeat: '73%' },
  ];

  const smsHealth = [
    { label: 'SMS balance', value: '84%', tone: 'text-emerald-400' },
    { label: 'Auto reminders', value: '97%', tone: 'text-cyan-400' },
    { label: 'Review requests', value: '60%', tone: 'text-violet-400' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold">
              Clinic analytics
            </p>
            <h1 className="text-3xl font-black mt-2">Klinika boshqaruv paneli</h1>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Live health</p>
            <p className="text-lg font-bold text-white">Healthy</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map(({ label, value, delta, color, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</span>
                <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-400`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-2xl font-black text-white">{value}</span>
                <span className="text-xs font-bold text-emerald-400">{delta}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Doctor retention score</h2>
              <div className="flex items-center gap-2 text-amber-300">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-semibold">Top performer</span>
              </div>
            </div>

            <div className="space-y-3">
              {doctors.map((doc) => (
                <div key={doc.name} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-100">{doc.name}</p>
                      <p className="text-xs text-slate-400">Repeat visits: {doc.repeat}</p>
                    </div>
                    <span className="text-sm font-black text-cyan-300">{doc.score}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${doc.score}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex justify-between">
                    <span>Revenue</span>
                    <span className="font-semibold text-slate-200">{doc.revenue}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">SMS health</h2>
            </div>

            <div className="space-y-4">
              {smsHealth.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className={`text-sm font-bold ${item.tone}`}>{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: item.value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;
