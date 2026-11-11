import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  VolumeX,
  X,
  Check,
  RotateCcw,
  Clock as ClockIcon,
  Timer,
  Plus,
  Minus,
} from 'lucide-react';
import {
  startContinuousPreAlert,
  startContinuousLoudAlarm,
  stopAllContinuousAlerts,
  playCentiTick,
} from '../utils/audioAlerts';
import { triggerBrowserNotification } from '../utils/notifications';
import { calculateCentiTime, CentiTime } from '../utils/timeCalculations';
import { Language, translations } from '../utils/i18n';

interface CentiminuteStopwatchProps {
  audioEnabled: boolean;
  lang: Language;
  currentTime: CentiTime;
  durationMinutes: number;
  setDurationMinutes: (mins: number) => void;
  preAlertMinutes: number;
  setPreAlertMinutes: (mins: number) => void;
  onClockClick?: () => void;
}

export const STORAGE_KEY = 'usps_dolly_clock_persistent_app_state';

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const polarToCartesian = (centerX: number, centerY: number, rad: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + rad * Math.cos(angleInRadians),
      y: centerY + rad * Math.sin(angleInRadians),
    };
  };

  let sweep = endAngle - startAngle;
  while (sweep < 0) sweep += 360;
  if (sweep >= 360) sweep = 359.99;

  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, startAngle + sweep);
  const largeArcFlag = sweep <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y,
  ].join(' ');
}

export const CentiminuteStopwatch: React.FC<CentiminuteStopwatchProps> = ({
  audioEnabled,
  lang,
  currentTime,
  durationMinutes,
  setDurationMinutes,
  preAlertMinutes,
  setPreAlertMinutes,
  onClockClick,
}) => {
  const t = translations[lang];
  const pad = (n: number) => String(n).padStart(2, '0');

  // Load initial settings directly from localStorage so state is immediately restored on refresh
  const [clockInHours, setClockInHours] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.clockInHours === 'number' && parsed.clockInHours >= 0 && parsed.clockInHours <= 23) {
          return parsed.clockInHours;
        }
      }
    } catch {
      // fallback
    }
    return currentTime.hours;
  });

  const [clockInTics, setClockInTics] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.clockInTics === 'number' && parsed.clockInTics >= 0 && parsed.clockInTics <= 99) {
          return parsed.clockInTics;
        }
      }
    } catch {
      // fallback
    }
    return currentTime.centiHoursInt;
  });

  // Modal editing state for Clock-In Time (Hora de inicio)
  const [isClockInModalOpen, setIsClockInModalOpen] = useState<boolean>(false);
  const [tempHours, setTempHours] = useState<number>(clockInHours);
  const [tempTics, setTempTics] = useState<number>(clockInTics);
  const [tempHoursStr, setTempHoursStr] = useState<string>(() => String(clockInHours));
  const [tempTicsStr, setTempTicsStr] = useState<string>(() => String(clockInTics));
  const [activeHand, setActiveHand] = useState<'hours' | 'tics'>('tics');
  const isClockInDirty = tempHours !== clockInHours || tempTics !== clockInTics;

  // Dedicated Focus Screen for "Minutos a contar"
  const [isDurationFocusOpen, setIsDurationFocusOpen] = useState<boolean>(false);
  const [tempDuration, setTempDuration] = useState<number>(durationMinutes);
  const [tempDurationStr, setTempDurationStr] = useState<string>(() => String(durationMinutes));
  const isDurationDirty = tempDuration !== durationMinutes;

  // Alert triggers & 60-second auto-silence timer
  const [activeAlert, setActiveAlert] = useState<'pre' | 'final' | null>(null);
  const [preAlertFired, setPreAlertFired] = useState<boolean>(false);
  const [finalAlarmFired, setFinalAlarmFired] = useState<boolean>(false);
  const isMutedByUserRef = useRef<boolean>(false);
  const autoSilenceTimerRef = useRef<number | null>(null);

  // SVG Dial dragging interaction in clock-in modal
  const dialSvgRef = useRef<SVGSVGElement | null>(null);
  const [isDraggingNeedle, setIsDraggingNeedle] = useState<boolean>(false);

  // Tracks when "Ponchar ahora" was pressed so it disappears until the next tic arrives
  const [punchedTic, setPunchedTic] = useState<number | null>(null);
  const isPunchHidden = punchedTic !== null && punchedTic === currentTime.centiHoursInt;

  // "Poionon" spring bounce animation trigger for clock-in time display
  const [isPoionon, setIsPoionon] = useState<boolean>(false);

  // Save changes to localStorage immediately whenever core state updates
  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const prev = existing ? JSON.parse(existing) : {};
      const payload = {
        ...prev,
        clockInHours,
        clockInTics,
        durationMinutes,
        preAlertMinutes,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore localStorage quota errors
    }
  }, [clockInHours, clockInTics, durationMinutes, preAlertMinutes]);

  // Cleanup alerts on unmount
  useEffect(() => {
    return () => {
      stopAllContinuousAlerts();
      if (autoSilenceTimerRef.current !== null) {
        clearTimeout(autoSilenceTimerRef.current);
      }
    };
  }, []);

  // Compute punch target date, pre-alert date, and format results with decimal dot (.)
  const computePunch = useCallback(() => {
    const now = new Date();

    // Convert clockInTics (0-99) into minutes and seconds
    const totalMinutes = (clockInTics / 100) * 60;
    const clockInMin = Math.floor(totalMinutes);
    const clockInSec = Math.round((totalMinutes - clockInMin) * 60);

    let startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      clockInHours,
      clockInMin,
      clockInSec,
      0
    );

    // If startDate is more than 12 hours ahead, user clocked in on a night shift
    if (startDate.getTime() > now.getTime() + 12 * 60 * 60 * 1000) {
      startDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const punchDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const preAlertDate = new Date(punchDate.getTime() - preAlertMinutes * 60 * 1000);

    // Punch out tics (horas divididas en 100 tics, sin segundos, con punto decimal)
    const punchTotalSecInHour = punchDate.getMinutes() * 60 + punchDate.getSeconds() + punchDate.getMilliseconds() / 1000;
    const punchTics = Math.min(99, Math.floor((punchTotalSecInHour / 3600) * 100));
    const punchCentiFormatted = `${pad(punchDate.getHours())}.${pad(punchTics)}`;

    // Punch out traditional wall clock (con segundos)
    const punchTraditional = `${pad(punchDate.getHours())}:${pad(punchDate.getMinutes())}:${pad(punchDate.getSeconds())}`;

    // Total duration in ms
    const totalDurationMs = durationMinutes * 60 * 1000;
    const startMs = startDate.getTime();
    const targetMs = punchDate.getTime();
    const nowMs = now.getTime();

    const elapsedMs = Math.max(0, nowMs - startMs);
    let remainingMs = 0;
    if (nowMs < startMs) {
      remainingMs = totalDurationMs;
    } else {
      remainingMs = Math.max(0, targetMs - nowMs);
    }
    remainingMs = Math.min(totalDurationMs, remainingMs);

    const progressRatio = totalDurationMs > 0
      ? Math.min(1, Math.max(0, elapsedMs / totalDurationMs))
      : 0;

    const remainingSecTotal = Math.floor(remainingMs / 1000);
    const remMinutes = Math.floor(remainingSecTotal / 60);
    const remSeconds = remainingSecTotal % 60;
    const remainingFormatted = `${pad(remMinutes)}:${pad(remSeconds)}`;

    return {
      startDate,
      punchDate,
      preAlertDate,
      punchCentiFormatted,
      punchTraditional,
      punchTics,
      totalDurationMs,
      elapsedMs,
      remainingMs,
      progressRatio,
      remainingFormatted,
    };
  }, [clockInHours, clockInTics, durationMinutes, preAlertMinutes]);

  const calc = computePunch();

  // Reset/Silencing action
  const handleMuteAlert = useCallback(() => {
    isMutedByUserRef.current = true;
    if (autoSilenceTimerRef.current !== null) {
      clearTimeout(autoSilenceTimerRef.current);
      autoSilenceTimerRef.current = null;
    }
    stopAllContinuousAlerts();
    setActiveAlert(null);
  }, []);

  // Intelligent alarm recalculation and silencing logic:
  const reevaluateAlerts = useCallback((
    newHours: number,
    newTics: number,
    newDuration: number,
    newPreAlert: number
  ) => {
    const now = new Date();
    const nowMs = now.getTime();

    const totalMinutes = (newTics / 100) * 60;
    const clockInMin = Math.floor(totalMinutes);
    const clockInSec = Math.round((totalMinutes - clockInMin) * 60);

    let startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      newHours,
      clockInMin,
      clockInSec,
      0
    );
    if (startDate.getTime() > nowMs + 12 * 60 * 60 * 1000) {
      startDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const newPunchDate = new Date(startDate.getTime() + newDuration * 60 * 1000);
    const newPreAlertDate = new Date(newPunchDate.getTime() - newPreAlert * 60 * 1000);

    const targetMs = newPunchDate.getTime();
    const preAlertMs = newPreAlertDate.getTime();
    const remaining = targetMs - nowMs;

    isMutedByUserRef.current = false;
    if (autoSilenceTimerRef.current !== null) {
      clearTimeout(autoSilenceTimerRef.current);
      autoSilenceTimerRef.current = null;
    }

    // 1. Final alarm check: if new punch time is in the future, silence it immediately
    if (remaining > 0) {
      setFinalAlarmFired(false);
      if (activeAlert === 'final') {
        stopAllContinuousAlerts();
        setActiveAlert(null);
      }
    }

    // 2. Pre-alert check:
    if (nowMs < preAlertMs || remaining <= 0) {
      setPreAlertFired(false);
      if (activeAlert === 'pre') {
        stopAllContinuousAlerts();
        setActiveAlert(null);
      }
    } else if (nowMs >= preAlertMs && remaining > 0) {
      if (activeAlert !== 'pre' && !preAlertFired) {
        setPreAlertFired(true);
        setActiveAlert('pre');
        startContinuousPreAlert();
        triggerBrowserNotification(
          lang === 'es' ? '🔔 ¡TIMBRE DE AVISO!' : '🔔 PRE-ALERT WARNING!',
          { body: lang === 'es' ? `Faltan ${newPreAlert} min para ponchar.` : `${newPreAlert} min until punch out.` }
        );
        autoSilenceTimerRef.current = window.setTimeout(() => {
          handleMuteAlert();
        }, 60000);
      }
    }
  }, [activeAlert, preAlertFired, handleMuteAlert, lang]);

  // Alert check & 60-second auto-shutoff (DOES NOT auto-restart when finished, stays until manual restart)
  useEffect(() => {
    const nowMs = Date.now();
    const targetMs = calc.punchDate.getTime();
    const preAlertMs = calc.preAlertDate.getTime();
    const remaining = targetMs - nowMs;

    // Silence alerts if time recalculation put the events in the future
    if (remaining > 0) {
      if (finalAlarmFired) setFinalAlarmFired(false);
      if (activeAlert === 'final') {
        stopAllContinuousAlerts();
        setActiveAlert(null);
      }
      if (nowMs < preAlertMs) {
        if (preAlertFired) setPreAlertFired(false);
        if (activeAlert === 'pre') {
          stopAllContinuousAlerts();
          setActiveAlert(null);
        }
      }
      isMutedByUserRef.current = false;
    }

    if (isMutedByUserRef.current) return;

    // Trigger pre-alert
    if (nowMs >= preAlertMs && !preAlertFired && remaining > 0) {
      setPreAlertFired(true);
      setActiveAlert('pre');
      startContinuousPreAlert();
      triggerBrowserNotification(
        lang === 'es' ? '🔔 ¡TIMBRE DE AVISO!' : '🔔 PRE-ALERT WARNING!',
        { body: lang === 'es' ? `Faltan ${preAlertMinutes} min para ponchar.` : `${preAlertMinutes} min until punch out.` }
      );

      if (autoSilenceTimerRef.current !== null) clearTimeout(autoSilenceTimerRef.current);
      autoSilenceTimerRef.current = window.setTimeout(() => {
        handleMuteAlert();
      }, 60000);
    }

    // Trigger final alarm
    if (nowMs >= targetMs && !finalAlarmFired) {
      setFinalAlarmFired(true);
      setActiveAlert('final');
      startContinuousLoudAlarm();
      triggerBrowserNotification(
        lang === 'es' ? '🚨 ¡HORA DE PONCHAR!' : '🚨 TIME TO PUNCH OUT!',
        { body: lang === 'es' ? `Debes ponchar a las: ${calc.punchCentiFormatted} tics.` : `Punch out at: ${calc.punchCentiFormatted} tics.` }
      );

      if (autoSilenceTimerRef.current !== null) clearTimeout(autoSilenceTimerRef.current);
      autoSilenceTimerRef.current = window.setTimeout(() => {
        handleMuteAlert();
      }, 60000);
    }
  }, [currentTime, calc, preAlertFired, finalAlarmFired, preAlertMinutes, activeAlert, handleMuteAlert, lang]);

  // Picture / Reset Button: Anchors clock-in to current instant, hides button, triggers poionon bounce
  const handleResetToNow = () => {
    const cur = calculateCentiTime();
    setClockInHours(cur.hours);
    setClockInTics(cur.centiHoursInt);
    setPunchedTic(cur.centiHoursInt);
    setIsPoionon(true);
    setTimeout(() => setIsPoionon(false), 900);
    setFinalAlarmFired(false);
    setPreAlertFired(false);
    isMutedByUserRef.current = false;
    reevaluateAlerts(cur.hours, cur.centiHoursInt, durationMinutes, preAlertMinutes);

    if (audioEnabled) {
      playCentiTick();
    }
  };

  // Start-Time Modal: Set to current time, save, and auto-close back to main screen
  const handleSetNowAndClose = () => {
    const cur = calculateCentiTime();
    setClockInHours(cur.hours);
    setClockInTics(cur.centiHoursInt);
    setPunchedTic(cur.centiHoursInt);
    setIsPoionon(true);
    setTimeout(() => setIsPoionon(false), 900);
    setFinalAlarmFired(false);
    setPreAlertFired(false);
    isMutedByUserRef.current = false;
    reevaluateAlerts(cur.hours, cur.centiHoursInt, durationMinutes, preAlertMinutes);
    if (audioEnabled) {
      playCentiTick();
    }
    setIsClockInModalOpen(false);
  };

  // Clock-in Modal open & save
  const handleOpenClockInModal = () => {
    setTempHours(clockInHours);
    setTempTics(clockInTics);
    setTempHoursStr(String(clockInHours));
    setTempTicsStr(String(clockInTics));
    setActiveHand('tics');
    setIsClockInModalOpen(true);
  };

  const handleSaveClockInModal = () => {
    setClockInHours(tempHours);
    setClockInTics(tempTics);
    setIsPoionon(true);
    setTimeout(() => setIsPoionon(false), 900);
    setFinalAlarmFired(false);
    setPreAlertFired(false);
    isMutedByUserRef.current = false;
    reevaluateAlerts(tempHours, tempTics, durationMinutes, preAlertMinutes);
    setIsClockInModalOpen(false);
    if (audioEnabled) playCentiTick();
  };

  // Duration Focus Screen open & save
  const handleOpenDurationFocus = () => {
    setTempDuration(durationMinutes);
    setTempDurationStr(String(durationMinutes));
    setIsDurationFocusOpen(true);
  };

  const handleSaveDurationFocus = () => {
    const finalVal = Math.min(1440, Math.max(1, tempDuration));
    setDurationMinutes(finalVal);
    setFinalAlarmFired(false);
    setPreAlertFired(false);
    isMutedByUserRef.current = false;
    reevaluateAlerts(clockInHours, clockInTics, finalVal, preAlertMinutes);
    setIsDurationFocusOpen(false);
    if (audioEnabled) playCentiTick();
  };

  // SVG Geometry for Unified Clock
  const size = 300;
  const center = size / 2; // 150
  const centiBandOuter = 136;
  const innerWallRadius = 98;
  const wallNumbersRadius = 76;

  // Angles:
  const hourAngle = ((currentTime.hours % 12) + currentTime.minutes / 60) * 30;
  const minuteAngle = (currentTime.minutes + currentTime.seconds / 60) * 6;
  const secondAngle = (currentTime.seconds + currentTime.milliseconds / 1000) * 6;
  const centiAngle = currentTime.centiHoursFloat * 3.6;

  // Dial Angles reflecting physical clock time:
  // Minute position from clock-in tics (50 tics = 30 min = 180 deg)
  const startMinuteFloat = (clockInTics / 100) * 60;
  const startMinuteAngle = (startMinuteFloat * 6) % 360;

  // Scheduled work duration arc in green (e.g. 30 min = 180 deg span)
  const durationSpan = Math.min(360, durationMinutes * 6);
  const endMinuteAngle = startMinuteAngle + durationSpan;

  // Pre-alert warning span in degrees (e.g. 5 min = 30 deg span)
  const warningMinsEffective = Math.min(preAlertMinutes, durationMinutes);
  const warningSpan = warningMinsEffective * 6;

  // Circumference logic:
  // Green arc: runs from startMinuteAngle up to (endMinuteAngle - warningSpan)
  const greenArcEndAngle = endMinuteAngle - warningSpan;
  const hasGreenArc = durationSpan > warningSpan;
  const greenArcPath = hasGreenArc
    ? describeArc(center, center, innerWallRadius + 3, startMinuteAngle, greenArcEndAngle)
    : '';

  // Orange arc: runs at the tail end of the circumference from greenArcEndAngle to endMinuteAngle
  const hasOrangeArc = warningSpan > 0;
  const orangeArcPath = hasOrangeArc
    ? describeArc(center, center, innerWallRadius + 3, greenArcEndAngle, endMinuteAngle)
    : '';

  // 100 Centésimas markings (0-100 tics)
  const centiTicks = Array.from({ length: 100 }, (_, i) => {
    const angle = i * 3.6 - 90;
    const rad = (angle * Math.PI) / 180;
    const isQuarter = i === 25 || i === 50 || i === 75 || i === 0;
    const isMajor = i % 10 === 0 && !isQuarter;
    const isMid = i % 5 === 0 && !isMajor && !isQuarter;
    const tickLen = isQuarter ? 9 : isMajor ? 6 : isMid ? 4 : 2;

    const x1 = center + (centiBandOuter - 1) * Math.cos(rad);
    const y1 = center + (centiBandOuter - 1) * Math.sin(rad);
    const x2 = center + (centiBandOuter - 1 - tickLen) * Math.cos(rad);
    const y2 = center + (centiBandOuter - 1 - tickLen) * Math.sin(rad);

    const labelRad = 114;
    const lx = center + labelRad * Math.cos(rad);
    const ly = center + labelRad * Math.sin(rad) + 3.5;

    return { i, x1, y1, x2, y2, isMajor, isQuarter, isMid, lx, ly };
  });

  // Traditional 12 Hour numbers
  const traditionalHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hourNum, idx) => {
    const angle = idx * 30 - 90;
    const rad = (angle * Math.PI) / 180;
    const lx = center + wallNumbersRadius * Math.cos(rad);
    const ly = center + wallNumbersRadius * Math.sin(rad) + 4;
    return { hourNum, lx, ly };
  });

  // Minute ticks on inner dial
  const minuteTicks = Array.from({ length: 60 }, (_, i) => {
    const angle = i * 6 - 90;
    const rad = (angle * Math.PI) / 180;
    const isFive = i % 5 === 0;
    const tickLen = isFive ? 5 : 2.5;

    const x1 = center + (innerWallRadius - 1) * Math.cos(rad);
    const y1 = center + (innerWallRadius - 1) * Math.sin(rad);
    const x2 = center + (innerWallRadius - 1 - tickLen) * Math.cos(rad);
    const y2 = center + (innerWallRadius - 1 - tickLen) * Math.sin(rad);

    return { i, x1, y1, x2, y2, isFive };
  });

  // Modal needle drag math for clock-in modal
  const updateNeedleFromCoords = useCallback((clientX: number, clientY: number, handToUpdate: 'hours' | 'tics') => {
    if (!dialSvgRef.current) return;
    const rect = dialSvgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    if (handToUpdate === 'hours') {
      const rawH = Math.round(angle / 30) % 12;
      setTempHours((prev) => {
        const isPM = prev >= 12;
        const mapped = isPM ? (rawH === 0 ? 12 : rawH + 12) : (rawH === 12 ? 0 : rawH);
        const finalH = mapped % 24;
        setTempHoursStr(String(finalH));
        return finalH;
      });
    } else {
      const ticsVal = Math.round(angle / 3.6) % 100;
      setTempTics(ticsVal);
      setTempTicsStr(String(ticsVal));
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    setIsDraggingNeedle(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateNeedleFromCoords(e.clientX, e.clientY, activeHand);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingNeedle) {
      updateNeedleFromCoords(e.clientX, e.clientY, activeHand);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingNeedle) {
      setIsDraggingNeedle(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  return (
    <div className="w-full h-full max-h-full flex flex-col justify-start max-w-5xl mx-auto px-1 sm:px-3 pt-0 pb-1 select-none overflow-hidden">
      {/* ALERTA / PRE-ALARMA */}
      {activeAlert && (
        <div className="shrink-0 mb-1 flex items-center justify-center">
          <button
            type="button"
            onClick={handleMuteAlert}
            className="w-full sm:w-auto py-2 px-6 bg-gradient-to-b from-[#d6effc] via-[#b6e4fa] to-[#80c8f5] hover:from-[#e4f4fd] hover:to-[#92d3f7] active:from-[#b0def8] active:to-[#6bbfe8] text-slate-950 font-sans font-black text-xs sm:text-sm border-2 border-[#3c7fb1] rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_0_#2b72a6,0_6px_8px_rgba(0,0,0,0.4)] cursor-pointer flex items-center justify-center gap-2 select-none transition-all active:translate-y-0.5"
          >
            <VolumeX className="w-4 h-4 text-slate-900 stroke-[2.5]" />
            <span>
              {t.silenceRemaining} {calc.remainingFormatted}
            </span>
          </button>
        </div>
      )}


      {/* 2. MAIN SINGLE-SCREEN WORKSPACE: Clock on Left + Controls & Punch Target on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center flex-1 my-0.5 overflow-hidden w-full">
        {/* Left Column: Reloj agrandado al máximo + en la parte superior izquierda la hora y en la derecha el botón Ponchar */}
        <div className="md:col-span-7 flex flex-col items-center justify-start shrink-0 py-0.5">
          {/* Barra superior del reloj:
              - Izquierda: Solamente la hora con relieve de campo editable (brinca con poionon al ponchar)
              - Derecha: Botón Ponchar idéntico al menú */}
          <div className="w-full max-w-[480px] flex items-center justify-between px-2 mb-1 shrink-0">
            {/* Parte superior izquierda: Solamente la hora sin decir ponchado ni nada, con relieve tipo campo editable */}
            <div className={`shrink-0 ${isPoionon ? 'animate-poionon ring-2 ring-amber-400 rounded-xl' : ''}`}>
              <button
                type="button"
                onClick={handleOpenClockInModal}
                title={t.modalHelpClockIn}
                className="bg-slate-950/90 p-1 rounded-xl border border-slate-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)] active:translate-y-0.5 cursor-pointer flex items-center gap-1 select-none transition-all group"
              >
                <div className="bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#d8e2ee] group-hover:from-[#ffffff] group-hover:to-[#cbe0f5] text-slate-950 border-2 border-[#5c7080] rounded-lg px-2.5 py-0.5 shadow-[inset_0_1px_1px_rgba(0,0,0,0.15),0_2px_0_#475569] flex items-baseline gap-1">
                  <span className="font-mono text-sm sm:text-base font-black text-slate-950 tabular-nums">
                    {pad(clockInHours)}.{pad(clockInTics)}
                  </span>
                  <span className="text-[10px] font-sans font-extrabold text-slate-600">
                    {t.tics}
                  </span>
                  <span className="text-[9px] text-sky-800 ml-0.5 font-bold">✎</span>
                </div>
              </button>
            </div>

            {/* Parte superior derecha: Botón Ponchar idéntico a como estaba en el menú */}
            {!isPunchHidden ? (
              <button
                type="button"
                onClick={handleResetToNow}
                title={t.resetTooltip}
                className="whitespace-nowrap transition-all py-1.5 px-4 rounded-xl text-xs sm:text-sm font-black cursor-pointer select-none active:translate-y-0.5 bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] text-white border-2 border-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_3px_0_#064e3b,0_5px_7px_rgba(0,0,0,0.4)] hover:brightness-105 shrink-0"
              >
                {t.punchOnly}
              </button>
            ) : (
              <div className="py-1 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold">{t.punchedBadge}</span>
                <span className="text-[10px] text-emerald-300/70">
                  ({t.punchedBadgeSub})
                </span>
              </div>
            )}
          </div>

          {/* Reloj analógico 3-in-1 agrandado al máximo */}
          <div
            onClick={onClockClick}
            title={lang === 'es' ? 'Toca el reloj para ir a la pantalla de Pared' : 'Tap clock to switch to Wall screen'}
            className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[430px] md:h-[430px] lg:w-[470px] lg:h-[470px] xl:w-[500px] xl:h-[500px] max-h-[calc(100vh-140px)] aspect-square flex items-center justify-center shrink-0 cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full select-none"
            >
              <defs>
                <radialGradient id="unifiedInnerWallGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="85%" stopColor="#0b1120" />
                  <stop offset="100%" stopColor="#080d19" />
                </radialGradient>
              </defs>

              {/* Clean dial base */}
              <circle cx={center} cy={center} r={centiBandOuter + 1} fill="#050811" stroke="#334155" strokeWidth="1" />

              {/* Inner Circle: Reloj Normal de Pared */}
              <circle
                cx={center}
                cy={center}
                r={innerWallRadius}
                fill="url(#unifiedInnerWallGrad)"
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* CIRCUNFERENCIA: Arco de tiempo en Verde Esperanza (desde inicio hasta antes del pre-alerta) */}
              {hasGreenArc && (
                <path
                  d={greenArcPath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className="transition-all duration-300 pointer-events-none"
                />
              )}

              {/* CIRCUNFERENCIA: Minutos antes va al final de la circunferencia sobreescrito de anaranjado */}
              {hasOrangeArc && (
                <path
                  d={orangeArcPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className="transition-all duration-300 pointer-events-none"
                />
              )}

              {/* 100 Centésimas graduations (Outer ring: 0-100 tics) en Verde */}
              <circle
                cx={center}
                cy={center}
                r={centiBandOuter}
                fill="none"
                stroke="#047857"
                strokeWidth="2"
                strokeOpacity="0.8"
              />
              {centiTicks.map((tick) => (
                <g key={`unified-centi-${tick.i}`}>
                  <line
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={
                      tick.isQuarter
                        ? '#34d399'
                        : tick.isMajor
                        ? '#10b981'
                        : tick.isMid
                        ? '#059669'
                        : '#047857'
                    }
                    strokeWidth={tick.isQuarter ? 2.2 : tick.isMajor ? 1.6 : 0.9}
                  />
                  {(tick.isQuarter || tick.isMajor) && (
                    <text
                      x={tick.lx}
                      y={tick.ly}
                      textAnchor="middle"
                      fontSize={tick.isQuarter ? '8.5' : '7'}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={tick.isQuarter ? '900' : '700'}
                      fill={tick.isQuarter ? '#6ee7b7' : '#a7f3d0'}
                    >
                      {tick.i}
                    </text>
                  )}
                </g>
              ))}

              {minuteTicks.map((tick) => (
                <line
                  key={`min-${tick.i}`}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke={tick.isFive ? '#94a3b8' : '#475569'}
                  strokeWidth={tick.isFive ? 1.5 : 0.8}
                />
              ))}

              {traditionalHours.map((h) => (
                <text
                  key={`hour-${h.hourNum}`}
                  x={h.lx}
                  y={h.ly}
                  textAnchor="middle"
                  fontSize="12"
                  fontFamily="Inter, sans-serif"
                  fontWeight="800"
                  fill="#e2e8f0"
                >
                  {h.hourNum}
                </text>
              ))}

              {/* Brand Label */}
              <text
                x={center}
                y={center - 20}
                textAnchor="middle"
                fontSize="9"
                fontFamily="Inter, sans-serif"
                fontWeight="700"
                fill="#64748b"
                letterSpacing="1"
              >
                USPS DOLLY
              </text>
              <text
                x={center}
                y={center + 12}
                textAnchor="middle"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="900"
                fill="#fde047"
              >
                100 tics/h
              </text>

              {/* HANDS */}
              {/* Hour Hand (Crisp White) */}
              <g transform={`rotate(${hourAngle} ${center} ${center})`}>
                <line
                  x1={center}
                  y1={center + 10}
                  x2={center}
                  y2={center - 44}
                  stroke="#ffffff"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
              </g>

              {/* Minute Hand: White */}
              <g transform={`rotate(${minuteAngle} ${center} ${center})`}>
                <line
                  x1={center}
                  y1={center + 14}
                  x2={center}
                  y2={center - 70}
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>

              {/* Seconds Hand: Cyan */}
              <g transform={`rotate(${secondAngle} ${center} ${center})`} opacity="0.9">
                <line
                  x1={center}
                  y1={center + 16}
                  x2={center}
                  y2={center - 86}
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                />
                <circle cx={center} cy={center - 86} r="1.8" fill="#38bdf8" />
              </g>

              {/* Minutero / Manecilla de tics: Blanco */}
              <g transform={`rotate(${centiAngle} ${center} ${center})`}>
                <line
                  x1={center}
                  y1={center + 18}
                  x2={center}
                  y2={center - (centiBandOuter - 6)}
                  stroke="#ffffff"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <circle
                  cx={center}
                  cy={center - (centiBandOuter - 6)}
                  r="3.5"
                  fill="#ffffff"
                />
              </g>

              {/* Center Nut */}
              <circle cx={center} cy={center} r="5.5" fill="#ffffff" />
              <circle cx={center} cy={center} r="2" fill="#0b0f17" />
            </svg>
          </div>
        </div>

        {/* Right Column: Minutos a contar en 1 sola fila horizontal continua + Alarma en amarillo + Destino */}
        <div className="md:col-span-5 flex flex-col justify-center space-y-2.5">
          {/* Card 1: MINUTOS A CONTAR - ESTRICTAMENTE EN UNA SOLA LÍNEA HORIZONTAL SIN SALTO */}
          <div className="bg-slate-900/95 px-2.5 py-2 rounded-xl border border-slate-800 flex items-center justify-between gap-1.5 sm:gap-2 flex-nowrap whitespace-nowrap overflow-x-auto select-none">
            <div className="flex items-center gap-1.5 shrink-0 text-slate-300">
              <Timer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[10px] sm:text-xs font-bold lowercase tracking-wider whitespace-nowrap">
                {t.workMinsTitle}
              </span>
            </div>

            {/* Botón editable blanco estilo Aero con relieve */}
            <button
              type="button"
              onClick={handleOpenDurationFocus}
              title={t.workMinsTitle}
              className="bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#d8e2ee] hover:from-[#ffffff] hover:to-[#c5d8ed] text-slate-950 border-2 border-[#5c7080] rounded-xl px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_0_#475569,0_3px_5px_rgba(0,0,0,0.35)] active:translate-y-0.5 active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] cursor-pointer flex items-center gap-1 select-none transition-all shrink-0"
            >
              <span className="font-mono text-xs sm:text-sm font-black text-slate-950">
                {durationMinutes}
              </span>
              <span className="text-[9px] font-sans font-bold text-slate-700">
                {t.mins}
              </span>
            </button>

            {/* Presets de minutos en la misma línea: 10, 15, 30, 45, 60 (sin 'min', 60 en vez de 1 hora) */}
            <div className="flex items-center gap-1 shrink-0">
              {[10, 15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setDurationMinutes(mins);
                    setFinalAlarmFired(false);
                    setPreAlertFired(false);
                    isMutedByUserRef.current = false;
                    reevaluateAlerts(clockInHours, clockInTics, mins, preAlertMinutes);
                  }}
                  className={`py-1 px-1.5 sm:px-2 rounded-xl text-xs font-mono font-black transition-all cursor-pointer active:translate-y-0.5 text-center shrink-0 ${
                    durationMinutes === mins
                      ? 'bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] text-white border-2 border-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2.5px_0_#064e3b,0_4px_6px_rgba(0,0,0,0.4)]'
                      : 'bg-gradient-to-b from-[#064e3b] to-[#022c22] hover:from-[#065f46] hover:to-[#044e3b] text-emerald-100 border border-emerald-700/60 shadow-[0_2px_0_#022c22,0_3px_5px_rgba(0,0,0,0.35)]'
                  }`}
                >
                  {mins}
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Campana con ))) y texto "Alarma ## Minutos antes" en amarillo
              Botones de pre-alerta 1, 3, 5, 10 en gama amarilla/dorada con relieve similar a los verdes */}
          <div className="bg-slate-900/95 px-2.5 py-2 rounded-xl border border-slate-800 flex items-center justify-between gap-1.5 sm:gap-2 flex-nowrap whitespace-nowrap overflow-x-auto select-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center text-amber-400 shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400/20 stroke-[2.5]" />
                <span className="text-amber-400 font-black tracking-tighter text-xs sm:text-sm ml-0.5 select-none animate-pulse">
                  )))
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black text-amber-300 font-sans tracking-wide whitespace-nowrap">
                {lang === 'es'
                  ? `Alarma ${preAlertMinutes} Minutos antes`
                  : `Alarm ${preAlertMinutes} Minutes before`}
              </span>
            </div>

            {/* Botones numéricos 1, 3, 5, 10 en la misma línea con acabado amarillo/dorado */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {[1, 3, 5, 10].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setPreAlertMinutes(mins);
                    reevaluateAlerts(clockInHours, clockInTics, durationMinutes, mins);
                  }}
                  className={`py-1 px-2 sm:px-2.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer active:translate-y-0.5 shrink-0 ${
                    preAlertMinutes === mins
                      ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 border-2 border-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_3px_0_#92400e,0_5px_7px_rgba(0,0,0,0.45)]'
                      : 'bg-gradient-to-b from-[#713f12]/80 via-[#532b07]/80 to-[#2e1704]/90 hover:from-[#854d0e] hover:to-[#5c3008] text-amber-200 border border-amber-500/50 shadow-[0_2.5px_0_#2e1704,0_3px_5px_rgba(0,0,0,0.35)]'
                  }`}
                >
                  {mins}
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: DEBES PONCHAR A LAS (Marco más delgadito con números más grandes y tics un poco más pequeño) */}
          <div className="relative bg-[#070b14] border border-emerald-500/70 rounded-xl px-3 py-1.5 shadow-sm flex items-center justify-center my-0.5 min-h-[56px] sm:min-h-[60px]">
            <span className="absolute -top-2.5 left-3 bg-[#070b14] px-1.5 text-[10px] sm:text-[11px] font-bold lowercase tracking-wider text-emerald-400 select-none">
              {t.punchResultTitle}
            </span>

            <div className="flex items-baseline justify-center gap-1.5 py-0.5">
              <span className="font-mono text-5xl sm:text-6xl font-black text-[#22c55e] tracking-tight tabular-nums drop-shadow-[0_0_18px_rgba(34,197,94,0.55)]">
                {calc.punchCentiFormatted}
              </span>
              <span className="text-[#22c55e]/90 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                {t.tics}
              </span>
            </div>

            <div className="absolute -bottom-2.5 right-3 bg-[#070b14] px-1.5 text-[10px] sm:text-[11px] font-mono text-emerald-300 flex items-center select-none">
              <span className="text-emerald-400 font-normal">{t.wall}&nbsp;</span>
              <span className="text-white font-normal tabular-nums">
                {calc.punchTraditional}
              </span>
            </div>
          </div>

          {/* Barra de progreso de recordatorio (reminding) reubicada debajo del marco de debes ponchar, sin letras bold ni total */}
          <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono font-normal">
              <span className="text-slate-400 text-[11px] font-sans font-normal">{t.timeRemaining}</span>
              <span className="text-emerald-400 text-xs sm:text-sm font-normal tabular-nums">
                {calc.remainingFormatted}
              </span>
            </div>

            {/* Dynamic Reminding Progress Bar with uniform thickness (h-2.5) */}
            <div className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
              {(() => {
                const dur = durationMinutes;
                const pre = Math.min(preAlertMinutes, dur);
                const preStartRatio = dur > 0 ? (dur - pre) / dur : 0;
                const progress = calc.progressRatio;
                const isComplete = progress >= 1;

                // Orange pre-alert zone at the tail end
                const orangeLeft = preStartRatio * 100;
                const orangeWidth = (1 - preStartRatio) * 100;

                // Blue elapsed bar growing from 0 up to preStartRatio (or 100% when finished)
                const blueWidth = isComplete ? 100 : Math.min(progress, preStartRatio) * 100;

                // Green segment overwriting the orange section during pre-alert window
                const greenWidth = (!isComplete && progress > preStartRatio)
                  ? (progress - preStartRatio) * 100
                  : 0;

                return (
                  <>
                    {/* Pre-alert orange zone proportional to pre-alert minutes at the end of the shift */}
                    {!isComplete && (
                      <div
                        className="absolute top-0 bottom-0 bg-amber-500"
                        style={{ left: `${orangeLeft}%`, width: `${orangeWidth}%` }}
                      />
                    )}

                    {/* Blue elapsed bar growing from the start */}
                    <div
                      className="absolute top-0 bottom-0 bg-sky-500 transition-all duration-300"
                      style={{ left: 0, width: `${blueWidth}%` }}
                    />

                    {/* Green progress overwriting the orange zone when time enters pre-alert window */}
                    {greenWidth > 0 && (
                      <div
                        className="absolute top-0 bottom-0 bg-emerald-500 transition-all duration-300"
                        style={{ left: `${orangeLeft}%`, width: `${greenWidth}%` }}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PANTALLA EXCLUSIVA / FOCUS PARA "MINUTOS A CONTAR" */}
      {isDurationFocusOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="fixed top-2 left-2 right-2 max-w-md mx-auto z-[999] bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border-2 border-amber-500 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
              <span className="font-black text-cyan-300 text-xs sm:text-sm uppercase tracking-wider truncate">
                {t.workMinsTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsDurationFocusOpen(false)}
                className={
                  !isDurationDirty
                    ? 'bg-gradient-to-b from-[#f7f9fa] via-[#e5ecf0] to-[#cbdaf0] hover:from-[#ffffff] hover:to-[#b8d4f6] text-slate-900 border-2 border-[#5c7080] rounded-xl text-xs font-black px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_0_#475569,0_4px_6px_rgba(0,0,0,0.3)] active:translate-y-0.5 cursor-pointer select-none ring-2 ring-amber-400/70'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-xl text-xs font-bold px-3 py-1.5 cursor-pointer select-none active:translate-y-0.5'
                }
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={!isDurationDirty}
                onClick={handleSaveDurationFocus}
                className={
                  isDurationDirty
                    ? 'bg-gradient-to-b from-[#bfe4f7] via-[#86cbf5] to-[#4fa8df] hover:from-[#d1edfa] hover:to-[#3e9cd7] text-slate-950 border-2 border-[#2b72a6] rounded-xl text-xs font-black px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_0_#1e5b87,0_4px_8px_rgba(0,0,0,0.35)] active:translate-y-0.5 cursor-pointer flex items-center gap-1 select-none ring-2 ring-sky-400 animate-pulse'
                    : 'opacity-40 cursor-not-allowed pointer-events-none bg-slate-800 text-slate-500 border border-slate-700 rounded-xl text-xs font-bold px-3.5 py-1.5 flex items-center gap-1 select-none'
                }
              >
                <Check className="w-4 h-4 stroke-[3] text-sky-950" />
                <span>{t.accept}</span>
              </button>
            </div>
          </div>

          <div className="max-w-md w-full mx-auto my-auto mt-16 space-y-4">
            <div className="bg-[#0f172a] border-2 border-cyan-500/60 rounded-3xl p-5 text-center space-y-4 shadow-2xl">
              <div className="text-xs uppercase tracking-wider font-bold text-slate-400">
                {t.shiftDurationTitle}
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(1, tempDuration - 5);
                    setTempDuration(next);
                    setTempDurationStr(String(next));
                  }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 text-white font-black text-xl flex items-center justify-center shadow-[0_3px_0_#0f172a] active:translate-y-0.5 cursor-pointer"
                >
                  <Minus className="w-5 h-5 stroke-[3]" />
                </button>

                <div className="bg-gradient-to-b from-[#ffffff] via-[#f1f5f9] to-[#e2e8f0] p-2 rounded-2xl border-2 border-slate-500 shadow-inner flex items-baseline justify-center px-4 min-w-[130px]">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tempDurationStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTempDurationStr(val);
                      if (val !== '') {
                        setTempDuration(Math.min(1440, parseInt(val, 10)));
                      }
                    }}
                    onBlur={() => {
                      if (tempDurationStr === '' || parseInt(tempDurationStr, 10) <= 0) {
                        setTempDurationStr('30');
                        setTempDuration(30);
                      } else {
                        const num = Math.min(1440, Math.max(1, parseInt(tempDurationStr, 10)));
                        setTempDuration(num);
                        setTempDurationStr(String(num));
                      }
                    }}
                    className="w-20 text-center font-mono text-3xl sm:text-4xl font-black text-slate-950 bg-transparent outline-none"
                  />
                  <span className="text-sm font-sans font-black text-slate-700 ml-1">
                    {t.mins}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(1440, tempDuration + 5);
                    setTempDuration(next);
                    setTempDurationStr(String(next));
                  }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 text-white font-black text-xl flex items-center justify-center shadow-[0_3px_0_#0f172a] active:translate-y-0.5 cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Equivalencia en centésimas / tics */}
              <div className="bg-slate-900/90 py-2 px-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-around">
                <div>
                  <span className="text-slate-500">{t.ticsLabel} </span>
                  <span className="text-amber-400 font-black">
                    {((tempDuration / 60) * 100).toFixed(1)} {t.tics}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{t.hoursLabel} </span>
                  <span className="text-cyan-300 font-bold">
                    {(tempDuration / 60).toFixed(2)} h
                  </span>
                </div>
              </div>

              {/* Presets de minutos */}
              <div className="space-y-1.5 pt-1 text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {t.presetsLabel}
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[10, 15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setTempDuration(mins);
                        setTempDurationStr(String(mins));
                      }}
                      className={`py-2 px-1 rounded-xl text-xs font-mono font-black transition-all cursor-pointer active:translate-y-0.5 text-center ${
                        tempDuration === mins
                          ? 'bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] text-white border-2 border-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_3px_0_#064e3b,0_5px_7px_rgba(0,0,0,0.4)] scale-[1.02]'
                          : 'bg-gradient-to-b from-[#064e3b] to-[#022c22] hover:from-[#065f46] hover:to-[#044e3b] text-emerald-100 border border-emerald-700/60 shadow-[0_2.5px_0_#022c22,0_4px_6px_rgba(0,0,0,0.35)]'
                      }`}
                    >
                      {mins === 60 ? t.oneHour : `${mins} ${t.mins}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL FOR EDITING CLOCK-IN TIME (HORA EN QUE HICE CLOCK) - AGRANDADO AL MÁXIMO */}
      {isClockInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          {/* Barra superior de confirmación / ahora */}
          <div className="fixed top-2 left-2 right-2 max-w-lg md:max-w-xl mx-auto z-[999] bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border-2 border-amber-500 shadow-[0_8px_24px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-3 duration-150">
            <button
              type="button"
              onClick={handleSetNowAndClose}
              title={t.nowTooltip}
              className="bg-gradient-to-b from-[#fde047] via-[#f59e0b] to-[#d97706] hover:from-[#fef08a] hover:to-[#b45309] text-slate-950 border-2 border-amber-300 rounded-xl text-xs font-black px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_3px_0_#92400e,0_4px_6px_rgba(0,0,0,0.35)] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 select-none"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.8]" />
              <span>{t.now}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsClockInModalOpen(false)}
                className={
                  !isClockInDirty
                    ? 'bg-gradient-to-b from-[#f7f9fa] via-[#e5ecf0] to-[#cbdaf0] hover:from-[#ffffff] hover:to-[#b8d4f6] text-slate-900 border-2 border-[#5c7080] rounded-xl text-xs font-black px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_0_#475569,0_4px_6px_rgba(0,0,0,0.3)] active:translate-y-0.5 cursor-pointer select-none ring-2 ring-amber-400/70'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-xl text-xs font-bold px-3 py-1.5 cursor-pointer select-none active:translate-y-0.5'
                }
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={!isClockInDirty}
                onClick={handleSaveClockInModal}
                className={
                  isClockInDirty
                    ? 'bg-gradient-to-b from-[#bfe4f7] via-[#86cbf5] to-[#4fa8df] hover:from-[#d1edfa] hover:to-[#3e9cd7] text-slate-950 border-2 border-[#2b72a6] rounded-xl text-xs font-black px-3.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_0_#1e5b87,0_4px_8px_rgba(0,0,0,0.35)] active:translate-y-0.5 cursor-pointer flex items-center gap-1 select-none ring-2 ring-sky-400 animate-pulse'
                    : 'opacity-40 cursor-not-allowed pointer-events-none bg-slate-800 text-slate-500 border border-slate-700 rounded-xl text-xs font-bold px-3.5 py-1.5 flex items-center gap-1 select-none'
                }
              >
                <Check className="w-4 h-4 stroke-[3] text-sky-950" />
                <span>{t.accept}</span>
              </button>
            </div>
          </div>

          <div
            className="bg-[#0f1523] border-2 border-amber-500/70 rounded-2xl max-w-lg md:max-w-xl w-full shadow-2xl p-3 sm:p-5 space-y-3 mt-14 mb-auto max-h-[calc(100dvh-4.5rem)] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Internal Header */}
            <div className="pb-1 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-slate-300 text-xs sm:text-sm">
                {t.modalHelpClockIn}
              </span>
              <button
                type="button"
                onClick={() => setIsClockInModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de manecilla a mover y campos de entrada en 1 sola fila */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              {/* Botones de manecilla */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveHand('hours')}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-bold font-sans rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 ${
                    activeHand === 'hours'
                      ? 'bg-gradient-to-b from-[#38bdf8] via-[#0284c7] to-[#0369a1] text-white border-2 border-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_#075985] font-black'
                      : 'bg-gradient-to-b from-[#f2f2f2] via-[#ebebeb] to-[#cfcfcf] text-slate-800 border border-[#707070]'
                  }`}
                >
                  <span>{t.hoursRange}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveHand('tics')}
                  className={`flex-1 py-1.5 px-2.5 text-xs font-bold font-sans rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:translate-y-0.5 ${
                    activeHand === 'tics'
                      ? 'bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-slate-950 border-2 border-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_0_#b45309] font-black'
                      : 'bg-gradient-to-b from-[#f2f2f2] via-[#ebebeb] to-[#cfcfcf] text-slate-800 border border-[#707070]'
                  }`}
                >
                  <span>{t.ticsRange}</span>
                </button>
              </div>

              {/* Entradas numéricas editables */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-b from-[#f7f9fa] via-[#e5ecf0] to-[#cbdaf0] p-1 border border-[#707070] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_0_#64748b] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-700 mr-1.5 font-sans">H:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tempHoursStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTempHoursStr(val);
                      if (val !== '') {
                        const num = Math.min(23, Math.max(0, parseInt(val, 10)));
                        setTempHours(num);
                      }
                    }}
                    onBlur={() => {
                      if (tempHoursStr === '') {
                        setTempHoursStr('0');
                        setTempHours(0);
                      } else {
                        const num = Math.min(23, Math.max(0, parseInt(tempHoursStr, 10) || 0));
                        setTempHours(num);
                        setTempHoursStr(String(num));
                      }
                    }}
                    className="w-14 text-center font-mono text-lg font-black bg-white text-slate-950 border border-slate-400 rounded-md py-0.5 outline-none focus:border-[#268cce] shadow-inner"
                  />
                </div>

                <div className="bg-gradient-to-b from-[#f7f9fa] via-[#e5ecf0] to-[#cbdaf0] p-1 border border-[#707070] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_0_#64748b] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-amber-700 mr-1 font-sans">Tics:</span>
                  <span className="text-slate-900 font-black font-mono text-base mr-0.5">.</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tempTicsStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTempTicsStr(val);
                      if (val !== '') {
                        const num = Math.min(99, Math.max(0, parseInt(val, 10)));
                        setTempTics(num);
                      }
                    }}
                    onBlur={() => {
                      if (tempTicsStr === '') {
                        setTempTicsStr('0');
                        setTempTics(0);
                      } else {
                        const num = Math.min(99, Math.max(0, parseInt(tempTicsStr, 10) || 0));
                        setTempTics(num);
                        setTempTicsStr(String(num));
                      }
                    }}
                    className="w-14 text-center font-mono text-lg font-black bg-white text-slate-950 border border-slate-400 rounded-md py-0.5 outline-none focus:border-[#268cce] shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Interactive Dial in Modal - Agrandado al máximo que permita la pantalla */}
            <div className="flex flex-col items-center justify-center pt-1">
              <div className="relative select-none rounded-full p-2.5 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600 shadow-2xl">
                <svg
                  ref={dialSvgRef}
                  viewBox="0 0 200 200"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="w-64 h-64 sm:w-80 sm:h-80 md:w-[360px] md:h-[360px] max-h-[48vh] sm:max-h-[54vh] aspect-square touch-none cursor-grab active:cursor-grabbing select-none"
                >
                  <circle cx="100" cy="100" r="97" fill="#060912" stroke="#334155" strokeWidth="2" />
                  <circle cx="100" cy="100" r="91" fill="#0b101d" />
                  <circle cx="100" cy="100" r="64" fill="#080c16" stroke="#1e293b" strokeWidth="1.2" />

                  {/* 100 Centesimal marks around the perimeter */}
                  {Array.from({ length: 100 }).map((_, i) => {
                    const angle = i * 3.6 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const isQuarter = i % 25 === 0;
                    const isTen = i % 10 === 0 && !isQuarter;
                    const isFive = i % 5 === 0 && !isQuarter && !isTen;
                    const tickLen = isQuarter ? 10 : isTen ? 7 : isFive ? 5 : 3;
                    const r1 = 89;
                    const r2 = r1 - tickLen;
                    const x1 = 100 + r1 * Math.cos(rad);
                    const y1 = 100 + r1 * Math.sin(rad);
                    const x2 = 100 + r2 * Math.cos(rad);
                    const y2 = 100 + r2 * Math.sin(rad);
                    return (
                      <line
                        key={`modal-c-${i}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isQuarter ? '#fbbf24' : isTen ? '#fde047' : isFive ? '#ca8a04' : '#475569'}
                        strokeWidth={isQuarter ? '2.2' : isTen ? '1.5' : '0.8'}
                      />
                    );
                  })}

                  {/* Quarter centesimal labels */}
                  <text x="100" y="24" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="900" textAnchor="middle">.00</text>
                  <text x="178" y="103" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="900" textAnchor="middle">.25</text>
                  <text x="100" y="183" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="900" textAnchor="middle">.50</text>
                  <text x="22" y="103" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="900" textAnchor="middle">.75</text>

                  {/* 12 Hour numbers inside inner ring */}
                  {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h, idx) => {
                    const angle = idx * 30 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const lx = 100 + 48 * Math.cos(rad);
                    const ly = 100 + 48 * Math.sin(rad) + 3.5;
                    return (
                      <text
                        key={`modal-h-${h}`}
                        x={lx}
                        y={ly}
                        fill="#cbd5e1"
                        fontSize="8.5"
                        fontFamily="Inter, sans-serif"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {h}
                      </text>
                    );
                  })}

                  {/* Hour hand (Horas) */}
                  {(() => {
                    const hAngle = (((tempHours % 12) + tempTics / 100) * 30 * Math.PI) / 180;
                    const isHActive = activeHand === 'hours';
                    return (
                      <g>
                        <line
                          x1="100"
                          y1="100"
                          x2={100 + 38 * Math.sin(hAngle)}
                          y2={100 - 38 * Math.cos(hAngle)}
                          stroke={isHActive ? '#38bdf8' : '#ffffff'}
                          strokeWidth={isHActive ? '5' : '3.5'}
                          strokeLinecap="round"
                        />
                        {isHActive && (
                          <circle
                            cx={100 + 38 * Math.sin(hAngle)}
                            cy={100 - 38 * Math.cos(hAngle)}
                            r="4.5"
                            fill="#38bdf8"
                          />
                        )}
                      </g>
                    );
                  })()}

                  {/* Centesimal / Tics hand */}
                  {(() => {
                    const ticsAngle = (tempTics * 3.6 * Math.PI) / 180;
                    const isTActive = activeHand === 'tics';
                    return (
                      <g>
                        <line
                          x1="100"
                          y1="100"
                          x2={100 + 72 * Math.sin(ticsAngle)}
                          y2={100 - 72 * Math.cos(ticsAngle)}
                          stroke={isTActive ? '#fbbf24' : '#ffffff'}
                          strokeWidth={isTActive ? '4' : '2.8'}
                          strokeLinecap="round"
                        />
                        <circle
                          cx={100 + 72 * Math.sin(ticsAngle)}
                          cy={100 - 72 * Math.cos(ticsAngle)}
                          r={isTActive ? '5' : '3.5'}
                          fill={isTActive ? '#fbbf24' : '#ffffff'}
                        />
                      </g>
                    );
                  })()}

                  {/* Center cap */}
                  <circle cx="100" cy="100" r="6" fill={activeHand === 'tics' ? '#fbbf24' : '#38bdf8'} />
                  <circle cx="100" cy="100" r="2.5" fill="#090d16" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
