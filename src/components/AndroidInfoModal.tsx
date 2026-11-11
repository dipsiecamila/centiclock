import React, { useState } from 'react';
import { Smartphone, Download, Github, Terminal, Copy, Check, X, ShieldCheck, Code, Cloud } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface AndroidInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
}

export const AndroidInfoModal: React.FC<AndroidInfoModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const isEs = lang === 'es';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#0c111c] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-500/20 via-slate-900 to-amber-500/10 border-b border-emerald-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {isEs ? 'Android desde Visual Studio Code' : 'Android from Visual Studio Code'}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isEs ? 'Sin Android Studio' : 'No Android Studio'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isEs ? 'Usa tu VS Code + ./actualizar.sh + GitHub para tu teléfono' : 'Use VS Code + ./actualizar.sh + GitHub for your phone'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300">
          {/* Quick PWA Install direct button */}
          {isInstallable && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-amber-300 text-xs sm:text-sm">
                  {isEs ? '📱 Opción 1: Instalar directo ahora' : '📱 Option 1: Direct Install now'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isEs ? 'Instala como app nativa en tu teléfono Android con un clic' : 'Install as native app on Android phone in 1 click'}
                </div>
              </div>
              <button
                onClick={install}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                {isEs ? 'Instalar App' : 'Install App'}
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{isEs ? '¡La app ya está corriendo instalada en tu pantalla principal!' : 'App is already running installed on your home screen!'}</span>
            </div>
          )}

          {/* Paso 1: VS Code Terminal */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white text-xs sm:text-sm">
              <Code className="w-4 h-4 text-sky-400" />
              <span>{isEs ? 'Paso 1: Abre en Visual Studio Code y corre tu script' : 'Step 1: Open in Visual Studio Code and run your script'}</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {isEs
                ? 'No necesitas tener instalado Android Studio. Abre la terminal de Visual Studio Code (Ctrl + ~) y ejecuta:'
                : 'No Android Studio needed. Open your VS Code terminal (Ctrl + ~) and run:'}
            </p>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300">
              <code>./actualizar.sh</code>
              <button
                onClick={() => handleCopy('./actualizar.sh', 'sh')}
                className="p-1 hover:text-white transition-colors"
                title="Copiar comando"
              >
                {copiedCmd === 'sh' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              {isEs
                ? '⚙️ Este script compila tu app web, actualiza los archivos Android y sube los cambios a tu repositorio de GitHub.'
                : '⚙️ This script builds your web app, syncs Android assets and pushes changes to your GitHub repo.'}
            </div>
          </div>

          {/* Paso 2: GitHub Actions compila el APK automáticamente */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2 font-semibold text-white text-xs sm:text-sm">
              <Cloud className="w-4 h-4 text-purple-400" />
              <span>{isEs ? 'Paso 2: GitHub compila el APK en la nube' : 'Step 2: GitHub builds the APK in the cloud'}</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {isEs
                ? 'Hemos agregado el flujo de GitHub Actions (.github/workflows/build-apk.yml). Cada vez que subas cambios a GitHub, GitHub compilará el archivo APK automáticamente:'
                : 'We included a GitHub Actions workflow. Each time you push to GitHub, GitHub builds the APK automatically:'}
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 pl-1">
              <li>{isEs ? 'Entra a tu repositorio en GitHub desde tu computadora o teléfono.' : 'Open your GitHub repository on PC or phone.'}</li>
              <li>{isEs ? 'Ve a la pestaña superior ' : 'Go to top tab '}<strong className="text-amber-300">"Actions"</strong>.</li>
              <li>{isEs ? 'Entra a la última tarea verde llamada ' : 'Open the latest green run named '}<strong className="text-emerald-300">"Compilar APK para teléfono"</strong>.</li>
              <li>
                {isEs
                  ? 'Al final de la página encontrarás para descargar el archivo: '
                  : 'At the bottom download the artifact: '}
                <span className="font-mono text-emerald-400 font-bold">USPS-Dolly-Clock-APK</span>.
              </li>
              <li>{isEs ? 'Ábrelo en tu teléfono Android y pulsa Instalar.' : 'Open it on your Android phone and tap Install.'}</li>
            </ol>
          </div>

          {/* Paso 3: Conectar a GitHub por primera vez */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2 font-semibold text-white text-xs sm:text-sm">
              <Github className="w-4 h-4 text-slate-200" />
              <span>{isEs ? 'Paso 3: Conectar tu carpeta a GitHub (si aún no lo has hecho)' : 'Step 3: Connect folder to GitHub (if not done yet)'}</span>
            </div>
            <p className="text-slate-400 text-xs">
              {isEs
                ? 'Pega estos 3 comandos en tu terminal de Visual Studio Code:'
                : 'Paste these 3 commands into your VS Code terminal:'}
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>git remote add origin https://github.com/TU_USUARIO/TU_REPO.git</span>
                <button onClick={() => handleCopy('git remote add origin https://github.com/TU_USUARIO/TU_REPO.git', 'git1')}>
                  {copiedCmd === 'git1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>git branch -M main</span>
                <button onClick={() => handleCopy('git branch -M main', 'git2')}>
                  {copiedCmd === 'git2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>git push -u origin main</span>
                <button onClick={() => handleCopy('git push -u origin main', 'git3')}>
                  {copiedCmd === 'git3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[11px] text-slate-400">
            {isEs ? 'Visual Studio Code 🚀 Android' : 'Visual Studio Code 🚀 Android'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs cursor-pointer transition-colors"
          >
            {isEs ? 'Entendido' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
