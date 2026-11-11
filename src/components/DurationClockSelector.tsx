import React from 'react';

interface DurationClockSelectorProps {
  selectedMinutes: number;
  onSelectDuration: (minutes: number) => void;
  lang: 'es' | 'en';
}

export const DurationClockSelector: React.FC<DurationClockSelectorProps> = ({
  selectedMinutes,
  onSelectDuration,
  lang,
}) => {
  // Preset positions on clock dial:
  // 5m -> 1 (30 deg)
  // 10m -> 2 (60 deg)
  // 15m -> 3 (90 deg)
  // 20m -> 4 (120 deg)
  // 30m -> 6 (180 deg)
  // 45m -> 9 (270 deg)
  // 60m (1 hora) -> 12 (0 deg / top)
  const buttons = [
    { minutes: 60, label: lang === 'es' ? '1 h' : '1 h', angle: 0 },
    { minutes: 5, label: '5m', angle: 30 },
    { minutes: 10, label: '10m', angle: 60 },
    { minutes: 15, label: '15m', angle: 90 },
    { minutes: 20, label: '20m', angle: 120 },
    { minutes: 30, label: '30m', angle: 180 },
    { minutes: 45, label: '45m', angle: 270 },
  ];

  const radius = 104;
  const center = 135;

  return (
    <div className="flex flex-col items-center select-none py-2">
      <div className="relative w-[270px] h-[270px]">
        {/* Clean face without distracting 'guarnición' */}
        <svg viewBox="0 0 270 270" className="w-full h-full pointer-events-none">
          {/* Base dial surface */}
          <circle
            cx={center}
            cy={center}
            r="126"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="3"
          />
          {/* Subtle center dial */}
          <circle
            cx={center}
            cy={center}
            r="44"
            fill="#101726"
            stroke="#1e293b"
            strokeWidth="2"
          />
        </svg>

        {/* Center Display with clean numbers */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-3xl font-black text-amber-400 leading-none">
            {selectedMinutes >= 60
              ? `${(selectedMinutes / 60).toFixed(selectedMinutes % 60 === 0 ? 0 : 1)}h`
              : `${selectedMinutes}m`}
          </span>
          <span className="text-[11px] text-slate-400 font-mono mt-1">
            {selectedMinutes * 100} cmin
          </span>
        </div>

        {/* Protruding 3D Buttons ('Botones sobresalidos') */}
        {buttons.map((b) => {
          const rad = ((b.angle - 90) * Math.PI) / 180;
          const x = center + radius * Math.cos(rad);
          const y = center + radius * Math.sin(rad);
          const isSelected = selectedMinutes === b.minutes;

          return (
            <button
              key={b.minutes}
              type="button"
              onClick={() => onSelectDuration(b.minutes)}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute w-12 h-12 rounded-full font-mono text-xs font-black transition-all cursor-pointer flex items-center justify-center shadow-lg active:scale-95 ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/50 shadow-amber-400/30 scale-110 z-10 border-2 border-white'
                  : 'bg-slate-800 text-slate-100 border-2 border-slate-600 hover:border-amber-400 hover:bg-slate-700 hover:scale-105 shadow-black/60'
              }`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
