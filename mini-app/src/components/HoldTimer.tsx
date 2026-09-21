import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface HoldTimerProps {
  initialSeconds?: number;
  onExpire: () => void;
}

export const HoldTimer: React.FC<HoldTimerProps> = ({
  initialSeconds = 180,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const percent = (secondsLeft / initialSeconds) * 100;
  const isUrgent = secondsLeft < 45;

  return (
    <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-colors ${
      isUrgent
        ? 'bg-rose-50 border-rose-200 text-rose-800'
        : 'bg-amber-50 border-amber-200 text-amber-900'
    }`}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          {isUrgent ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          )}
          Slot siz uchun saqlanmoqda
        </span>
        <span className="font-mono text-sm font-bold tracking-tight">
          {timeFormatted}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 rounded-full ${
            isUrgent ? 'bg-rose-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
