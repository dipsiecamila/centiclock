/**
 * USPS Dolly Clock
 * Menú principal: Ponchar / Clock-in.
 * Navegación por clic en el reloj: Ponchar -> Pared -> Tics -> Ponchar.
 * Pantalla única compacta sin scroll.
 * Persistencia en localStorage y ciclo de reloj optimizado.
 * Sistema global de alarmas y parada de emergencia (STOP).
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Navbar } from './components/Navbar';
import { CentiClockDisplay } from './components/CentiClockDisplay';
import { CentiminuteStopwatch, STORAGE_KEY } from './components/CentiminuteStopwatch';
import { calculateCentiTime, CentiTime } from './utils/timeCalculations';
import { Language, translations } from './utils/i18n';
import { stopAllContinuousAlerts, subscribeAlertState } from './utils/audioAlerts';
import { AlarmOverlay } from './components/AlarmOverlay';
import { releaseWakeLock, stopNativeAlarm } from './utils/nativeAlarms';

// Error boundary to prevent white-screen crashes under any circumstance
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}
class AppErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('USPS Dolly Clock caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#070a11] text-slate-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="text-xl font-bold text-emerald-400">USPS Dolly Clock</div>
          <p className="text-sm text-slate-400 max-w-md">
            Ocurrió un reinicio preventivo. Haz clic en el botón para reanudar con tus datos intactos.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm cursor-pointer shadow-lg active:scale-95"
          >
            Reanudar Reloj
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Load active tab safely from localStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (['ambos', 'pared', 'tics'].includes(parsed.activeTab)) {
          return parsed.activeTab;
        }
      }
    } catch {
      // fallback
    }
    return 'ambos';
  });

  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lang === 'en' || parsed.lang === 'es') {
          return parsed.lang;
        }
      }
    } catch {
      // fallback
    }
    return 'en';
  });
  const [currentTime, setCurrentTime] = useState<CentiTime>(() => calculateCentiTime());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Global Alert State (Listening to audioAlerts directly)
  const [globalAlert, setGlobalAlert] = useState<{
    isActive: boolean;
    type: 'pre' | 'final' | 'test' | null;
  }>({ isActive: false, type: null });

  useEffect(() => {
    return subscribeAlertState((isActive, type) => {
      setGlobalAlert({ isActive, type });
    });
  }, []);

  const handleGlobalStopAlert = () => {
    stopAllContinuousAlerts();
    stopNativeAlarm();
    releaseWakeLock();
    setGlobalAlert({ isActive: false, type: null });
  };

  // Persistent settings for punch clock: initialized from localStorage
  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.durationMinutes === 'number' && parsed.durationMinutes > 0) {
          return parsed.durationMinutes;
        }
      }
    } catch {
      // fallback
    }
    return 30;
  });

  const [preAlertMinutes, setPreAlertMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.preAlertMinutes === 'number' && parsed.preAlertMinutes >= 0) {
          return parsed.preAlertMinutes;
        }
      }
    } catch {
      // fallback
    }
    return 5;
  });

  // Save activeTab to localStorage whenever it changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      const prev = existing ? JSON.parse(existing) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, activeTab: tab, updatedAt: Date.now() }));
    } catch {
      // fallback
    }
  };

  // Clock click navigation cycle: Ponchar ('ambos') -> Pared ('pared') -> Tics ('tics') -> Ponchar ('ambos')
  const handleClockClickCycle = () => {
    if (activeTab === 'ambos') {
      handleTabChange('pared');
    } else if (activeTab === 'pared') {
      handleTabChange('tics');
    } else {
      handleTabChange('ambos');
    }
  };

  // Lightweight 250ms interval + immediate sync when returning from background
  useEffect(() => {
    const updateNow = () => setCurrentTime(calculateCentiTime());
    const timer = setInterval(updateNow, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateNow();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', updateNow);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', updateNow);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleToggleLang = () => {
    setLang((prev) => {
      const nextLang: Language = prev === 'en' ? 'es' : 'en';
      try {
        const existing = localStorage.getItem(STORAGE_KEY);
        const parsed = existing ? JSON.parse(existing) : {};
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...parsed, lang: nextLang, updatedAt: Date.now() })
        );
      } catch {
        // fallback
      }
      return nextLang;
    });
  };

  const t = translations[lang];

  return (
    <AppErrorBoundary>
      <div className="h-[100dvh] w-screen overflow-hidden bg-[#070a11] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Top Navbar: Brand + Ponchar/Clock-in + Lang & Sound / Dynamic STOP */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
          lang={lang}
          onToggleLang={handleToggleLang}
          isAlerting={globalAlert.isActive}
          onStopAlert={handleGlobalStopAlert}
        />

        {/* Global Emergency Stop Header Banner: Shows immediately when ANY sound or alarm is ringing */}
        {globalAlert.isActive && (
          <div className="shrink-0 w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between z-50 animate-pulse shadow-[0_4px_20px_rgba(239,68,68,0.8)] border-b-2 border-red-300">
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide uppercase">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>{lang === 'es' ? '🚨 ¡TIMBRE / ALARMA SONANDO!' : '🚨 ALARM IS RINGING!'}</span>
            </div>
            <button
              type="button"
              onClick={handleGlobalStopAlert}
              className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-red-700 font-black text-xs sm:text-sm uppercase cursor-pointer shadow-lg transition-all"
            >
              🛑 {lang === 'es' ? 'APAGAR YA / STOP' : 'STOP ALARM NOW'}
            </button>
          </div>
        )}

        {/* Main Single-Screen Content (Shifted slightly upward to maximize clock space) */}
        <main className="flex-1 overflow-hidden flex flex-col justify-start items-center px-2 sm:px-4 pt-0.5 sm:pt-1 pb-1">
          {/* 1. Ambos (Default: Ponchar / Clock-in Unified Screen - kept mounted so alarms always tick) */}
          <div className={activeTab === 'ambos' ? 'w-full h-full flex flex-col justify-start items-center' : 'hidden'}>
            <CentiminuteStopwatch
              audioEnabled={audioEnabled}
              lang={lang}
              currentTime={currentTime}
              durationMinutes={durationMinutes}
              setDurationMinutes={setDurationMinutes}
              preAlertMinutes={preAlertMinutes}
              setPreAlertMinutes={setPreAlertMinutes}
              onClockClick={handleClockClickCycle}
            />
          </div>

          {/* 2. Pared (Traditional Wall Clock) */}
          {activeTab === 'pared' && (
            <CentiClockDisplay
              currentTime={currentTime}
              audioEnabled={audioEnabled}
              lang={lang}
              defaultMode="wall"
              onClockClick={handleClockClickCycle}
            />
          )}

          {/* 3. Tics (Centesimal Clock - 100 tics/hour) */}
          {activeTab === 'tics' && (
            <CentiClockDisplay
              currentTime={currentTime}
              audioEnabled={audioEnabled}
              lang={lang}
              defaultMode="centi"
              onClockClick={handleClockClickCycle}
            />
          )}
        </main>

        {/* Global Full-Screen Alarm Overlay with Giant STOP button - Active on ALL tabs */}
        <AlarmOverlay
          type={
            globalAlert.type === 'test' || activeTab !== 'ambos'
              ? globalAlert.type
              : null
          }
          onStop={handleGlobalStopAlert}
          lang={lang}
          preAlertMinutes={preAlertMinutes}
        />

        {/* Compact Status Footer */}
        <footer className="border-t border-slate-800/60 pt-1.5 pb-[calc(0.9rem+env(safe-area-inset-bottom,0px))] sm:pb-2.5 px-3 sm:px-4 text-[11px] text-slate-400 shrink-0 bg-[#070a11]">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="truncate font-semibold text-slate-200">
                USPS Dolly Clock v2.5
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleTabChange('ambos')}
                className={`cursor-pointer transition-colors ${activeTab === 'ambos' ? 'text-emerald-400 font-bold' : 'hover:text-slate-300'}`}
              >
                {t.tabBoth}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleTabChange('pared')}
                className={`cursor-pointer transition-colors ${activeTab === 'pared' ? 'text-emerald-400 font-bold' : 'hover:text-slate-300'}`}
              >
                {t.tabWall}
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleTabChange('tics')}
                className={`cursor-pointer transition-colors ${activeTab === 'tics' ? 'text-emerald-400 font-bold' : 'hover:text-slate-300'}`}
              >
                {t.tabTics}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </AppErrorBoundary>
  );
}
