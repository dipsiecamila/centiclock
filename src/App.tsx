/**
 * USPS Dolly Clock
 * Menú principal: Ponchar / Clock-in.
 * Navegación por clic en el reloj: Ponchar -> Pared -> Tics -> Ponchar.
 * Pantalla única compacta sin scroll.
 * Persistencia en localStorage y ciclo de reloj optimizado.
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Navbar } from './components/Navbar';
import { CentiClockDisplay } from './components/CentiClockDisplay';
import { CentiminuteStopwatch, STORAGE_KEY } from './components/CentiminuteStopwatch';
import { calculateCentiTime, CentiTime } from './utils/timeCalculations';
import { Language, translations } from './utils/i18n';

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
          <div className="text-xl font-bold text-amber-400">USPS Dolly Clock</div>
          <p className="text-sm text-slate-400 max-w-md">
            Ocurrió un reinicio preventivo. Haz clic en el botón para reanudar con tus datos intactos.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm cursor-pointer shadow-lg active:scale-95"
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

  const [lang, setLang] = useState<Language>('es');
  const [currentTime, setCurrentTime] = useState<CentiTime>(() => calculateCentiTime());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

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
        if (typeof parsed.preAlertMinutes === 'number' && parsed.preAlertMinutes > 0) {
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

  // Lightweight 250ms interval (4 times per second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(calculateCentiTime());
    }, 250);

    return () => clearInterval(timer);
  }, []);

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'es' ? 'en' : 'es'));
  };

  const t = translations[lang];

  return (
    <AppErrorBoundary>
      <div className="h-screen w-screen overflow-hidden bg-[#070a11] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
        {/* Top Navbar: Brand + Ponchar/Clock-in + Lang & Sound */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
          lang={lang}
          onToggleLang={handleToggleLang}
        />

        {/* Main Single-Screen Content (Shifted slightly upward to maximize clock space) */}
        <main className="flex-1 overflow-hidden flex flex-col justify-start items-center px-2 sm:px-4 pt-0.5 sm:pt-1 pb-1">
          {/* 1. Ambos (Default: Ponchar / Clock-in Unified Screen) */}
          {activeTab === 'ambos' && (
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
          )}

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

        {/* Compact Status Footer */}
        <footer className="border-t border-slate-800/60 py-1.5 px-4 text-[11px] text-slate-500 shrink-0">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-400">USPS Dolly</span>
              <span>·</span>
              <span>1 h = 100 tics = 60 min</span>
            </div>

            <div className="font-mono text-slate-500">
              {lang === 'es' ? 'Ponchar · Pared · Tics' : 'Clock-in · Wall · Tics'}
            </div>
          </div>
        </footer>
      </div>
    </AppErrorBoundary>
  );
}
