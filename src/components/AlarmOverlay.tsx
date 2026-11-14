import React from 'react';
import { Bell, VolumeX, AlertTriangle } from 'lucide-react';
import { Language } from '../utils/i18n';

interface AlarmOverlayProps {
  type: 'pre' | 'final' | 'test' | null;
  punchCentiFormatted?: string;
  punchTraditional?: string;
  remainingFormatted?: string;
  preAlertMinutes?: number;
  onStop: () => void;
  lang: Language;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({
  type,
  punchCentiFormatted,
  punchTraditional,
  remainingFormatted,
  preAlertMinutes = 5,
  onStop,
  lang,
}) => {
  if (!type) return null;

  const isFinal = type === 'final';
  const isTest = type === 'test';
  const isEs = lang === 'es';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none"
    >
      {/* Flashing screen backdrop */}
      <div
        className={`absolute inset-0 opacity-25 pointer-events-none animate-pulse ${
          isFinal ? 'bg-red-600' : isTest ? 'bg-amber-400' : 'bg-amber-500'
        }`}
      />

      <div
        className={`relative w-full max-w-md mx-auto p-6 sm:p-7 rounded-3xl border-4 text-center shadow-2xl overflow-hidden transition-all transform scale-100 ${
          isFinal
            ? 'bg-gradient-to-b from-[#220707] via-[#140404] to-[#070a11] border-red-500 shadow-red-500/60 ring-4 ring-red-500/30'
            : 'bg-gradient-to-b from-[#221604] via-[#140d02] to-[#070a11] border-amber-400 shadow-amber-500/60 ring-4 ring-amber-400/30'
        }`}
      >
        {/* Animated Badge Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center animate-bounce shadow-2xl ${
              isFinal
                ? 'bg-red-600 text-white shadow-red-600/80 ring-4 ring-red-300'
                : 'bg-amber-400 text-slate-950 shadow-amber-400/80 ring-4 ring-amber-200'
            }`}
          >
            {isFinal ? (
              <AlertTriangle className="w-10 h-10 stroke-[2.8]" />
            ) : (
              <Bell className="w-10 h-10 fill-current stroke-[2.8]" />
            )}
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase drop-shadow-md mb-2">
          {isFinal
            ? isEs
              ? '🚨 ¡HORA DE PONCHAR!'
              : '🚨 TIME TO PUNCH OUT!'
            : isTest
            ? isEs
              ? '🔊 ¡TIMBRE SONANDO!'
              : '🔊 CHIME IS RINGING!'
            : isEs
            ? `🔔 ¡AVISO: FALTAN ${preAlertMinutes} MIN!`
            : `🔔 PRE-ALERT: ${preAlertMinutes} MIN LEFT!`}
        </h2>

        {/* Target Time Info (if available) */}
        {punchCentiFormatted && (
          <div className="my-4 p-3.5 rounded-2xl bg-black/60 border border-slate-700/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {isEs ? 'Meta de Ponchada' : 'Punch Target'}
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 my-1 tabular-nums">
              {punchCentiFormatted}{' '}
              <span className="text-sm font-sans uppercase font-bold text-emerald-500/80">tics</span>
            </div>
            {punchTraditional && (
              <div className="text-xs font-mono text-slate-300">
                {isEs ? 'Hora de pared:' : 'Wall clock:'}{' '}
                <span className="font-bold text-white">{punchTraditional}</span>
              </div>
            )}
          </div>
        )}

        {/* MASSIVE EMERGENCY STOP BUTTON */}
        <button
          type="button"
          onClick={onStop}
          autoFocus
          className={`w-full py-5 sm:py-6 px-6 rounded-2xl font-black text-xl sm:text-2xl tracking-wide uppercase cursor-pointer active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3 animate-pulse ${
            isFinal
              ? 'bg-gradient-to-b from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:to-red-600 text-white border-2 border-red-300 shadow-[0_0_30px_rgba(239,68,68,0.8)]'
              : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 border-2 border-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.8)]'
          }`}
        >
          <VolumeX className="w-8 h-8 stroke-[3]" />
          <span>{isEs ? '🛑 APAGAR YA / STOP' : '🛑 STOP ALARM NOW'}</span>
        </button>

        <p className="mt-3 text-xs text-slate-300 font-semibold">
          {isEs
            ? 'Toca aquí para apagar el sonido y la vibración de inmediato.'
            : 'Tap here to immediately silence sound and vibration.'}
        </p>
      </div>
    </div>
  );
};
