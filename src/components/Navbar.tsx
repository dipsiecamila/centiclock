import React, { useState } from 'react';
import { Volume2, VolumeX, Smartphone } from 'lucide-react';
import { playPreAlarmChime } from '../utils/audioAlerts';
import { Language, translations } from '../utils/i18n';
import { AndroidInfoModal } from './AndroidInfoModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  lang: Language;
  onToggleLang: () => void;
  isAlerting?: boolean;
  onStopAlert?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  setActiveTab,
  setAudioEnabled,
  lang,
  onToggleLang,
  isAlerting = false,
  onStopAlert,
}) => {
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const t = translations[lang];

  const handleTestChime = () => {
    setAudioEnabled(true);
    playPreAlarmChime();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand with the EXACT green clock */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('ambos')}
              className="flex items-center gap-2 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/50 flex items-center justify-center bg-[#070a11] shadow-[0_0_8px_rgba(5,150,105,0.4)] group-hover:border-emerald-400 transition-colors">
                <img src="/icon.svg" alt="USPS Dolly Clock" className="w-full h-full object-cover" />
              </div>
              <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors whitespace-nowrap">
                USPS Dolly
              </span>
            </button>
          </div>

          {/* Right Actions: Android Button + Language Toggle & Sound/Stop Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Android Hub / VS Code / ./actualizar.sh Guide Button */}
            <button
              onClick={() => setShowAndroidModal(true)}
              title={lang === 'es' ? 'Opciones para Android, VS Code y GitHub' : 'Options for Android, VS Code & GitHub'}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Android</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={onToggleLang}
              title={lang === 'es' ? 'Switch interface to English' : 'Cambiar interfaz a Español'}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-black rounded-lg bg-gradient-to-b from-amber-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 text-amber-300 border border-amber-500/50 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>🌐</span>
              <span>{t.langButton}</span>
            </button>

            {/* When alerting, show a big RED pulsing STOP button right in navbar! */}
            {isAlerting ? (
              <button
                onClick={onStopAlert}
                title={lang === 'es' ? 'Apagar alarma inmediatamente' : 'Stop alarm immediately'}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-black rounded-lg bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white border-2 border-red-300 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.8)] active:scale-95 animate-pulse"
              >
                <VolumeX className="w-4 h-4 stroke-[3]" />
                <span className="font-mono tracking-wide">{lang === 'es' ? '🛑 APAGAR' : '🛑 STOP'}</span>
              </button>
            ) : (
              <button
                onClick={handleTestChime}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t.testSound}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Android and VS Code instructions modal */}
      <AndroidInfoModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
        lang={lang}
      />
    </>
  );
};
