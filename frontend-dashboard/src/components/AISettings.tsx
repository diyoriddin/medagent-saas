import React, { useState } from 'react';
import {
  Bot,
  ShieldCheck,
  Sparkles,
  Save,
  CheckCircle,
  Play,
  Terminal,
  AlertTriangle,
  Sliders,
  Cpu
} from 'lucide-react';
import { AIConfiguration } from '../types';
import { initialAISettings } from '../data/mockDashboardData';

export const AISettings: React.FC = () => {
  const [config, setConfig] = useState<AIConfiguration>(initialAISettings);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Playground state
  const [testQuery, setTestQuery] = useState<string>('Menda yurak sohasida kuchli og\'riq bor, qanday dori ichsam bo\'ladi?');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [toolCalled, setToolCalled] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleRunTest = () => {
    setIsTesting(true);
    setTestResponse(null);
    setToolCalled(null);

    setTimeout(() => {
      const q = testQuery.toLowerCase();

      if (q.includes('dori') || q.includes('og\'riq') || q.includes('davolash') || q.includes('kasal')) {
        // Strict guardrail trigger
        setToolCalled(null);
        setTestResponse(
          "⚠️ QAT'IY QOIDA: Men faqat navbatga yozuvchi botman, tibbiy tashxis qo'yish yoki dori tayinlash huquqiga ega emasman. Sizga yordam berishimiz uchun oliy toifali shifokorimiz qabuliga yoziling."
        );
      } else if (q.includes('kardiolog') || q.includes('shifokor')) {
        setToolCalled('get_doctors({ specialty: "Kardiolog" })');
        setTestResponse(
          'Klinikamizda Dr. Jasur Alimov (Kardiolog, 12 yil tajriba, ko\'rik narxi: 180,000 so\'m) qabul qiladilar. Bo\'sh vaqtlarni ko\'rish uchun "Vaqtni tanlash" tugmasini bosing.'
        );
      } else {
        setToolCalled('get_available_slots({ doctor_id: "doc-001", date: "2026-09-12" })');
        setTestResponse(
          'Bugun uchun quyidagi erkin vaqtlar mavjud: 10:00, 11:00, 14:00, 16:30. Qaysi vaqt sizga qulay?'
        );
      }
      setIsTesting(false);
    }, 600);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              AI Bot & Tibbiy Guardrail Sozlamalari
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Function calling, tibbiy xatolar va gallusinatsiyaga qarshi himoya filtrlari
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-cyan-500/20"
        >
          {isSaved ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-950" />
              <span>Saqlandi!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Sozlamalarni Saqlash</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Prompts & Model */}
        <div className="lg:col-span-2 space-y-5">
          {/* Strict Mode Banner */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-300 text-sm">
                Preemptive Engineering: Strict Function Calling Faol
              </h4>
              <p className="text-xs text-emerald-400/80 mt-1 leading-relaxed">
                AI erkin matn bilan tibbiy maslahat bera olmaydi. Faqat API orqali tasdiqlangan bazaviy slotlar bilan ishlaydi va bemorni shifokorga yo'naltiradi.
              </p>
            </div>
          </div>

          {/* System Prompt Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                AI System Prompt (Asosiy Ko'rsatma)
              </label>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                Strict Guardrails Enforced
              </span>
            </div>
            <textarea
              rows={6}
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Welcome Message Box */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Telegram Bot Xush Kelibsiz Xabari (Welcome Message)
            </label>
            <textarea
              rows={4}
              value={config.welcomeMsg}
              onChange={(e) => setConfig({ ...config, welcomeMsg: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Right 1 Col: Model & Playground */}
        <div className="space-y-5">
          {/* Model Configuration */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              AI Model Parametrlari
            </h3>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                LLM Provayder va Model
              </label>
              <select
                value={config.modelName}
                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="gpt-4o-mini">OpenAI GPT-4o-mini (Tavsiya etiladi)</option>
                <option value="gpt-4o">OpenAI GPT-4o (Yuqori aniqlik)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="claude-3-haiku">Claude 3.5 Haiku</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Asosiy Muloqot Tili
              </label>
              <select
                value={config.language}
                onChange={(e) => setConfig({ ...config, language: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-500"
              >
                <option value="uz">O'zbek tili (Lotin)</option>
                <option value="ru">Rus tili</option>
                <option value="en">Ingliz tili</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Harorat (Temperature):</span>
                <span className="font-mono text-cyan-400 font-bold">{config.temperature}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Past harorat (0.2) aniq va qat'iy javob berishni ta'minlaydi.
              </span>
            </div>
          </div>

          {/* Interactive Test Sandbox */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Play className="w-4 h-4 text-cyan-400" />
              Guardrail Test Sinovi
            </h3>
            <p className="text-[11px] text-slate-400">
              Botga tibbiy savol berib, uning qoidaga qanday rioya qilishini tekshiring:
            </p>

            <textarea
              rows={2}
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-hidden focus:border-cyan-500 resize-none"
            />

            <button
              onClick={handleRunTest}
              disabled={isTesting}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Tekshirilmoqda...' : 'Sinovdan O\'tkazish'}</span>
            </button>

            {/* Test Result output */}
            {testResponse && (
              <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 animate-in fade-in duration-200">
                {toolCalled && (
                  <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 p-1.5 rounded border border-cyan-800/40">
                    🛠 Function Tool: {toolCalled}
                  </div>
                )}
                <div className="text-xs text-slate-200 leading-relaxed">
                  {testResponse}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
