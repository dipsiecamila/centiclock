import React, { useState } from 'react';
import { Calendar, ArrowRight, Bell, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { CentiTime, computeProjection } from '../utils/timeCalculations';

interface ProjectionCardProps {
  currentTime: CentiTime;
  onSetAlarmForOffset: (offsetMinutes: number) => void;
}

export const ProjectionCard: React.FC<ProjectionCardProps> = ({
  currentTime,
  onSetAlarmForOffset,
}) => {
  const [selectedOffset, setSelectedOffset] = useState<number>(30); // 30 minutes by default as requested
  const [customOffsetInput, setCustomOffsetInput] = useState<string>('30');
  const [alarmScheduled, setAlarmScheduled] = useState<boolean>(false);

  const presets = [
    { minutes: 15, label: '+15 min', note: '1,500 cmin' },
    { minutes: 30, label: '+30 min (media hora)', note: '3,000 cmin', popular: true },
    { minutes: 45, label: '+45 min', note: '4,500 cmin' },
    { minutes: 60, label: '+1 hora', note: '6,000 cmin' },
    { minutes: 90, label: '+1h 30m', note: '9,000 cmin' },
  ];

  const now = new Date();
  const projection = computeProjection(now, selectedOffset, 5);

  const handleSelectPreset = (m: number) => {
    setSelectedOffset(m);
    setCustomOffsetInput(m.toString());
    setAlarmScheduled(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomOffsetInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 720) {
      setSelectedOffset(num);
      setAlarmScheduled(false);
    }
  };

  const handleArmAlarm = () => {
    onSetAlarmForOffset(selectedOffset);
    setAlarmScheduled(true);
    setTimeout(() => setAlarmScheduled(false), 3000);
  };

  // Centiminute equivalent calculations
  const totalCentiOffset = selectedOffset * 100;
  const preAlertOffset = Math.max(0, selectedOffset - 5);
  const preAlertCentiOffset = preAlertOffset * 100;

  return (
    <div className="bg-[#111726]/80 rounded-2xl border border-slate-800/80 p-6 sm:p-8 backdrop-blur-sm">
      {/* Title & context */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Proyección Temporal y Equivalentes a Futuro</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Calcula la hora equivalente en centiminutos para cualquier lapso (por ejemplo, media hora después).
          </p>
        </div>

        {/* Selected offset indicator */}
        <div className="text-xs font-mono px-3 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-amber-400">
          Lapso: +{selectedOffset} min ({totalCentiOffset.toLocaleString()} cmin)
        </div>
      </div>

      {/* Preset selector buttons */}
      <div className="mt-6 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.minutes}
            onClick={() => handleSelectPreset(p.minutes)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              selectedOffset === p.minutes
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <span>{p.label}</span>
            <span className="block text-[10px] opacity-75 font-mono">{p.note}</span>
          </button>
        ))}

        {/* Custom input */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
          <span className="text-xs text-slate-400">Otro:</span>
          <input
            type="number"
            min="1"
            max="720"
            value={customOffsetInput}
            onChange={handleCustomChange}
            className="w-16 bg-slate-800 text-xs font-mono text-white px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-amber-400 text-center"
          />
          <span className="text-xs text-slate-400">min</span>
        </div>
      </div>

      {/* Timeline Comparison Visualizer */}
      <div className="mt-8 bg-slate-950/60 rounded-xl border border-slate-800/80 p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Línea temporal con timbre anticipado (5 min antes)</span>
          <span className="text-amber-400 font-mono text-[11px] normal-case">
            1 minuto = 100 cmin
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Card 1: NOW */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 relative">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">1. AHORA MISMO</span>
              <span className="font-mono text-slate-400">T + 0</span>
            </div>
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              {currentTime.centiFormatted}
              <span className="text-xs text-slate-400 font-sans ml-1">cmin</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Tradicional: {currentTime.traditionalFormatted}
            </div>
            <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/40 px-2 py-1 rounded">
              Punto de partida actual
            </div>
          </div>

          {/* Card 2: PRE-ALARM 5 MINUTES BEFORE */}
          <div className="bg-amber-950/20 rounded-xl p-4 border border-amber-500/40 relative">
            <div className="flex items-center justify-between text-xs text-amber-400 mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                2. TIMBRE AVISO (-5 MIN)
              </span>
              <span className="font-mono text-amber-400">+{preAlertOffset}m</span>
            </div>
            <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {projection.preAlertCenti}
              <span className="text-xs text-amber-300 font-sans ml-1">cmin</span>
            </div>
            <div className="text-xs text-amber-300/80 mt-1 font-mono">
              Tradicional: {projection.preAlertTraditional}
            </div>
            <div className="mt-3 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 font-medium">
              🔔 Tu teléfono/reloj sonará aquí avisando que quedan 5 min
            </div>
          </div>

          {/* Card 3: TARGET (e.g. Media hora después) */}
          <div className="bg-cyan-950/20 rounded-xl p-4 border border-cyan-500/40 relative">
            <div className="flex items-center justify-between text-xs text-cyan-400 mb-2">
              <span className="font-semibold">3. META (+{selectedOffset} MIN)</span>
              <span className="font-mono text-cyan-400">+{selectedOffset}m</span>
            </div>
            <div className="font-mono text-2xl font-bold text-cyan-300 tabular-nums">
              {projection.targetCenti}
              <span className="text-xs text-cyan-400 font-sans ml-1">cmin</span>
            </div>
            <div className="text-xs text-cyan-300/80 mt-1 font-mono">
              Tradicional: {projection.targetTraditional}
            </div>
            <div className="mt-3 text-[11px] text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 font-medium">
              🎯 Tiempo total cumplido (+{totalCentiOffset.toLocaleString()} cmin)
            </div>
          </div>
        </div>

        {/* Progress connector line */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Tiempo entre timbre y meta final:</span>
          <span className="font-mono text-amber-400 font-semibold">
            Exactamente 5 minutos = 500 centiminutos (300 segundos)
          </span>
        </div>
      </div>

      {/* Action Banner to schedule alarm */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              ¿Deseas activar el temporizador para este lapso de {selectedOffset} minutos?
            </div>
            <div className="text-xs text-slate-400">
              Sonará un timbre suave y nítido a los {preAlertOffset} minutos (5 min antes) y la alarma final a los {selectedOffset} min.
            </div>
          </div>
        </div>

        <button
          onClick={handleArmAlarm}
          className={`py-2 px-5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            alarmScheduled
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md hover:shadow-amber-500/20 active:scale-95'
          }`}
        >
          {alarmScheduled ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>¡Alarma Programada!</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>Activar Alarma con Timbre -5m</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
