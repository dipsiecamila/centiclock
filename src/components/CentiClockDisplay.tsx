import React from 'react';
import { CentiTime } from '../utils/timeCalculations';
import { Language, translations } from '../utils/i18n';

interface CentiClockDisplayProps {
  currentTime: CentiTime;
  audioEnabled: boolean;
  lang: Language;
  defaultMode: 'wall' | 'centi';
  onClockClick?: () => void;
}

export const CentiClockDisplay: React.FC<CentiClockDisplayProps> = ({
  currentTime,
  lang,
  defaultMode,
  onClockClick,
}) => {
  const isWall = defaultMode === 'wall';
  const t = translations[lang];

  // SVG Dial geometry
  const size = 360;
  const center = size / 2; // 180
  const centiBandOuter = 164;
  const innerWallRadius = 120;
  const wallNumbersRadius = 94;

  // Angles for clock hands:
  const hourAngle = ((currentTime.hours % 12) + currentTime.minutes / 60) * 30;
  const minuteAngle = (currentTime.minutes + currentTime.seconds / 60) * 6;
  const secondAngle = (currentTime.seconds + currentTime.milliseconds / 1000) * 6;
  const centiAngle = currentTime.centiHoursFloat * 3.6;

  // 100 Centesimas graduations de la hora (Outer ring: 0 to 100 tics)
  const centiTicks = Array.from({ length: 100 }, (_, i) => {
    const angle = i * 3.6 - 90;
    const rad = (angle * Math.PI) / 180;
    const isQuarter = i === 25 || i === 50 || i === 75 || i === 0;
    const isMajor = i % 10 === 0 && !isQuarter;
    const isMid = i % 5 === 0 && !isMajor && !isQuarter;
    const tickLen = isQuarter ? 10 : isMajor ? 7 : isMid ? 4.5 : 2.5;

    const x1 = center + (centiBandOuter - 1) * Math.cos(rad);
    const y1 = center + (centiBandOuter - 1) * Math.sin(rad);
    const x2 = center + (centiBandOuter - 1 - tickLen) * Math.cos(rad);
    const y2 = center + (centiBandOuter - 1 - tickLen) * Math.sin(rad);

    const labelRad = 138;
    const lx = center + labelRad * Math.cos(rad);
    const ly = center + labelRad * Math.sin(rad) + 4;

    return { i, x1, y1, x2, y2, isMajor, isQuarter, isMid, lx, ly };
  });

  // Traditional 12 Hour numbers (inside innerWallRadius)
  const traditionalHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hourNum, idx) => {
    const angle = idx * 30 - 90;
    const rad = (angle * Math.PI) / 180;
    const lx = center + wallNumbersRadius * Math.cos(rad);
    const ly = center + wallNumbersRadius * Math.sin(rad) + 4.5;
    return { hourNum, lx, ly };
  });

  // Minute ticks on the inner wall dial (for normal wall clock)
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    const angle = i * 6 - 90;
    const rad = (angle * Math.PI) / 180;
    const isFive = i % 5 === 0;
    const tickLen = isFive ? 6 : 3;

    const x1 = center + (innerWallRadius - 2) * Math.cos(rad);
    const y1 = center + (innerWallRadius - 2) * Math.sin(rad);
    const x2 = center + (innerWallRadius - 2 - tickLen) * Math.cos(rad);
    const y2 = center + (innerWallRadius - 2 - tickLen) * Math.sin(rad);

    return { i, x1, y1, x2, y2, isFive };
  });

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="h-full flex flex-col justify-start items-center pt-0 pb-1 max-w-5xl mx-auto w-full select-none">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6 items-center w-full flex-1 my-0.5">
        {/* Left: Analog Dial (Clicking switches to next view: Pared -> Tics -> Ponchar) */}
        <div className="md:col-span-7 flex flex-col items-center justify-start shrink-0 py-0.5">
          <div
            onClick={onClockClick}
            title={
              isWall
                ? (lang === 'es' ? 'Toca el reloj para ver pantalla de Tics' : 'Tap clock to switch to Tics view')
                : (lang === 'es' ? 'Toca el reloj para volver a Ponchar' : 'Tap clock to return to Clock-in')
            }
            className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[430px] md:h-[430px] lg:w-[470px] lg:h-[470px] xl:w-[500px] xl:h-[500px] max-h-[calc(100vh-140px)] aspect-square flex items-center justify-center cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform group"
          >
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full select-none"
            >
              <defs>
                <radialGradient id="wallInnerGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="85%" stopColor="#0b1120" />
                  <stop offset="100%" stopColor="#080d19" />
                </radialGradient>
              </defs>

              {/* Clean dial base */}
              <circle cx={center} cy={center} r={centiBandOuter + 2} fill="#050811" stroke="#334155" strokeWidth="1" />

              {/* TICS MODE: 100 Centésimas de la HORA (0 a 100 tics) */}
              {!isWall && (
                <g opacity={1}>
                  <circle
                    cx={center}
                    cy={center}
                    r={centiBandOuter}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeOpacity="0.4"
                  />
                  {centiTicks.map((tick) => (
                    <g key={`centi-${tick.i}`}>
                      <line
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        stroke={
                          tick.isQuarter
                            ? '#fbbf24'
                            : tick.isMajor
                            ? '#fde047'
                            : tick.isMid
                            ? '#ca8a04'
                            : '#78716c'
                        }
                        strokeWidth={tick.isQuarter ? 2.2 : tick.isMajor ? 1.6 : 0.9}
                      />
                      {(tick.isQuarter || tick.isMajor) && (
                        <text
                          x={tick.lx}
                          y={tick.ly}
                          textAnchor="middle"
                          fontSize={tick.isQuarter ? '9' : '7.5'}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight={tick.isQuarter ? '900' : '700'}
                          fill={tick.isQuarter ? '#fbbf24' : '#fef08a'}
                        >
                          {tick.i}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              )}

              {/* PARED MODE: Reloj normal de pared */}
              <circle
                cx={center}
                cy={center}
                r={innerWallRadius}
                fill="url(#wallInnerGrad)"
                stroke="#334155"
                strokeWidth="1.5"
              />

              {isWall && (
                <g opacity={1}>
                  {minuteTicks.map((tick) => (
                    <line
                      key={`min-${tick.i}`}
                      x1={tick.x1}
                      y1={tick.y1}
                      x2={tick.x2}
                      y2={tick.y2}
                      stroke={tick.isFive ? '#94a3b8' : '#475569'}
                      strokeWidth={tick.isFive ? 1.6 : 0.9}
                    />
                  ))}
                  {traditionalHours.map((h) => (
                    <text
                      key={`hour-${h.hourNum}`}
                      x={h.lx}
                      y={h.ly}
                      textAnchor="middle"
                      fontSize="13"
                      fontFamily="Inter, sans-serif"
                      fontWeight="800"
                      fill="#e2e8f0"
                    >
                      {h.hourNum}
                    </text>
                  ))}
                </g>
              )}

              {/* Subdued Branding */}
              <text
                x={center}
                y={center - 24}
                textAnchor="middle"
                fontSize="10"
                fontFamily="Inter, sans-serif"
                fontWeight="700"
                fill="#64748b"
                letterSpacing="1"
              >
                USPS DOLLY
              </text>
              <text
                x={center}
                y={center + 14}
                textAnchor="middle"
                fontSize="8.5"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="900"
                fill={isWall ? '#38bdf8' : '#fde047'}
              >
                {isWall ? t.wallClockBadge : t.ticsClockBadge}
              </text>

              {/* HANDS */}
              {/* Hour hand (Crisp White) */}
              <g transform={`rotate(${hourAngle} ${center} ${center})`}>
                <line
                  x1={center}
                  y1={center + 12}
                  x2={center}
                  y2={center - 54}
                  stroke="#ffffff"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>

              {/* Minute hand: White */}
              {isWall && (
                <g transform={`rotate(${minuteAngle} ${center} ${center})`}>
                  <line
                    x1={center}
                    y1={center + 16}
                    x2={center}
                    y2={center - 86}
                    stroke="#ffffff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Seconds hand for normal wall clock: Cyan */}
              {isWall && (
                <g transform={`rotate(${secondAngle} ${center} ${center})`} opacity="0.9">
                  <line
                    x1={center}
                    y1={center + 18}
                    x2={center}
                    y2={center - 105}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                  />
                  <circle cx={center} cy={center - 105} r="2" fill="#38bdf8" />
                </g>
              )}

              {/* Minutero en Tics: Blanco para que se parezca al de pared */}
              {!isWall && (
                <g transform={`rotate(${centiAngle} ${center} ${center})`}>
                  <line
                    x1={center}
                    y1={center + 22}
                    x2={center}
                    y2={center - (centiBandOuter - 6)}
                    stroke="#ffffff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={center}
                    cy={center - (centiBandOuter - 6)}
                    r="4"
                    fill="#ffffff"
                  />
                </g>
              )}

              {/* Center Nut */}
              <circle cx={center} cy={center} r="6.5" fill={isWall ? '#38bdf8' : '#ffffff'} />
              <circle cx={center} cy={center} r="2.5" fill="#0b0f17" />
            </svg>
          </div>
        </div>

        {/* Right: Digital Readout */}
        <div className="md:col-span-5 flex flex-col justify-center">
          {/* TICS VIEW */}
          {!isWall && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 p-6 rounded-2xl text-center space-y-2 shadow-xl shadow-amber-950/20 max-w-md mx-auto w-full">
              <div className="font-mono text-5xl sm:text-6xl font-black text-amber-400 tabular-nums tracking-tight">
                {pad(currentTime.hours)}.{currentTime.centiHoursFormatted}
              </div>
              <div className="text-xs sm:text-sm font-mono font-bold text-amber-300 uppercase tracking-wider pt-2 border-t border-amber-500/20">
                {t.ticsClockTitle}
              </div>
            </div>
          )}

          {/* PARED VIEW */}
          {isWall && (
            <div className="bg-cyan-500/10 border-2 border-cyan-500/40 p-6 rounded-2xl text-center space-y-2 shadow-xl shadow-cyan-950/20 max-w-md mx-auto w-full">
              <div className="font-mono text-4xl sm:text-5xl font-bold text-cyan-300 tabular-nums tracking-tight">
                {currentTime.traditionalFormatted}
              </div>
              <div className="text-xs sm:text-sm font-mono font-bold text-cyan-300 uppercase tracking-wider pt-2 border-t border-cyan-500/20">
                {t.wallClockTitle}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
