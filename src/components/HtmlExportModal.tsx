import React, { useState } from 'react';
import { Code, Copy, Check, Download, X } from 'lucide-react';

interface HtmlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HtmlExportModal: React.FC<HtmlExportModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // The standalone single-file HTML containing the clock, parallel dials, projection, and loud alarm
  const standaloneHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reloj de Pared en Centésimas y Cronómetro Ponchador</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b0f17;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      min-height: 100vh;
    }
    .container {
      max-width: 680px;
      width: 100%;
      background: #111726;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    h1 {
      font-size: 1.3rem;
      font-weight: 800;
      color: #fff;
      margin-bottom: 6px;
      text-align: center;
    }
    p.subtitle {
      font-size: 0.85rem;
      color: #94a3b8;
      text-align: center;
      margin-bottom: 20px;
    }
    .clock-wrapper {
      position: relative;
      width: 330px;
      height: 330px;
      margin: 0 auto 20px auto;
    }
    svg { width: 100%; height: 100%; }
    .digital-box {
      background: #080c14;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 8px 0;
    }
    .row:not(:last-child) { border-bottom: 1px solid #1e293b; }
    .label { font-size: 0.82rem; color: #94a3b8; }
    .value { font-family: monospace; font-size: 1.2rem; font-weight: 700; }
    .value.amber { color: #fde047; font-size: 1.45rem; font-weight: 900; }

    /* Ponchador Box */
    .punch-box {
      background: #151c2e;
      border: 2px solid #f59e0b;
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 20px;
    }
    .punch-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #fbbf24;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .punch-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-top: 12px;
    }
    .field-label { font-size: 0.75rem; color: #cbd5e1; margin-bottom: 4px; font-weight: 600; display: block; }
    .input-field {
      width: 100%;
      background: #0b0f17;
      border: 1px solid #334155;
      color: #fff;
      font-family: monospace;
      font-size: 1.05rem;
      padding: 8px;
      border-radius: 8px;
      text-align: center;
      font-weight: bold;
    }
    .input-field:focus { outline: none; border-color: #f59e0b; }
    .punch-result {
      background: #080c14;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 14px;
      margin-top: 14px;
      text-align: center;
    }
    .punch-time-highlight {
      font-family: monospace;
      font-size: 2rem;
      font-weight: 900;
      color: #fff;
      margin: 4px 0;
    }
    .punch-centi-highlight {
      font-family: monospace;
      font-size: 1.1rem;
      color: #fde047;
      font-weight: 800;
    }
    .prealert-badge {
      display: inline-block;
      margin-top: 8px;
      background: rgba(6, 182, 212, 0.15);
      border: 1px solid #06b6d4;
      color: #67e8f9;
      font-size: 0.8rem;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 600;
    }

    .guide-box {
      background: #0f172a;
      border-radius: 12px;
      padding: 12px;
      font-size: 0.8rem;
      color: #cbd5e1;
      margin-bottom: 20px;
    }
    .guide-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
      font-family: monospace;
    }
    .guide-item { background: #1e293b; padding: 6px 10px; border-radius: 8px; }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 12px;
      background: #f59e0b;
      color: #0b0f17;
      font-weight: 800;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.95rem;
      margin-top: 10px;
      text-align: center;
    }
    .btn:hover { background: #d97706; }
    .btn.stop { background: #ef4444; color: #fff; display: none; }
    .status-text { font-size: 0.8rem; color: #fcd34d; margin-top: 8px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Reloj de Pared con Centésimas Notorias</h1>
    <p class="subtitle">Anillo exterior: 100 Centésimas (Amarillo Grande) · Anillo interior: Horas de Pared</p>

    <!-- Dial SVG con decimales amarillos notorios -->
    <div class="clock-wrapper">
      <svg id="clockSvg" viewBox="0 0 340 340">
        <!-- Bezel -->
        <circle cx="170" cy="170" r="162" fill="#0b101a" stroke="#334155" stroke-width="7"/>
        <!-- Centesimas Background Band -->
        <circle cx="170" cy="170" r="142" fill="#141c2c" stroke="#f59e0b" stroke-opacity="0.4" stroke-width="1.5"/>
        <g id="centiTicks"></g>
        <!-- Inner Separator -->
        <circle cx="170" cy="170" r="114" fill="#080c14" stroke="#334155" stroke-width="1.5"/>
        <g id="traditionalHours"></g>
        <!-- Hands -->
        <line id="hourHand" x1="170" y1="180" x2="170" y2="114" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <line id="minuteHand" x1="170" y1="185" x2="170" y2="82" stroke="#e2e8f0" stroke-width="3.5" stroke-linecap="round"/>
        <line id="centiHand" x1="170" y1="190" x2="170" y2="34" stroke="#fde047" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="170" cy="170" r="6" fill="#fde047"/>
      </svg>
    </div>

    <!-- Lecturas en vivo -->
    <div class="digital-box">
      <div class="row">
        <span class="label">Reloj de pared habitual (segundos):</span>
        <span class="value" id="tradTime">--:--:--</span>
      </div>
      <div class="row">
        <span class="label">Hora en centésimas de minuto (cmin):</span>
        <span class="value amber" id="centiTime">--:--.-- cmin</span>
      </div>
    </div>

    <!-- Ponchador: Digita tu clock y calcula la hora de ponchar -->
    <div class="punch-box">
      <div class="punch-title">
        <span>⏱️ CRONÓMETRO PONCHADOR</span>
        <span style="font-size:0.75rem; background:#78350f; color:#fde047; padding:2px 8px; border-radius:6px;">Cálculo de Ponchada</span>
      </div>
      <p style="font-size:0.75rem; color:#cbd5e1;">
        Digita a qué hora hiciste clock, cuántos minutos deseas contar y cuánto antes quieres el timbre.
      </p>

      <div class="punch-grid">
        <div>
          <label class="field-label">1. Hora del clock:</label>
          <input type="time" id="clockInInput" class="input-field" onchange="calculatePunch()">
        </div>
        <div>
          <label class="field-label">2. Minutos a contar:</label>
          <input type="number" id="minutesInput" class="input-field" value="30" min="1" max="1440" oninput="calculatePunch()">
        </div>
        <div>
          <label class="field-label">3. Timbre previo:</label>
          <input type="number" id="preAlertInput" class="input-field" value="5" min="1" max="60" oninput="calculatePunch()">
        </div>
      </div>

      <div class="punch-result">
        <span style="font-size:0.8rem; color:#fcd34d; font-weight:800; text-transform:uppercase;">
          🎯 DEBES PONCHAR A LAS:
        </span>
        <div class="punch-time-highlight" id="punchResultTrad">--:--:--</div>
        <div class="punch-centi-highlight" id="punchResultCenti">--:--.-- cmin</div>
        <div class="prealert-badge" id="preAlertResultBadge">
          🔔 Timbre sonará a las --:-- (5 min antes)
        </div>
      </div>

      <button class="btn" id="startPunchAlarmBtn" onclick="togglePunchAlarm()">Iniciar Seguimiento y Alarma Fuerte</button>
      <button class="btn stop" id="stopAlarmBtn" onclick="silenceAlarm()">SILENCIAR ALARMA FUERTE</button>
      <div class="status-text" id="alarmStatus">Alarma inactiva</div>
    </div>

    <!-- Guía visual rápida -->
    <div class="guide-box">
      <strong>Guía visual para tu reloj de pared:</strong>
      <div class="guide-grid">
        <div class="guide-item">En el 12 (00s) = <span style="color:#fde047;font-weight:bold;">0 cmin</span></div>
        <div class="guide-item">En el 3 (15s) = <span style="color:#fde047;font-weight:bold;">25 cmin</span></div>
        <div class="guide-item">En el 6 (30s) = <span style="color:#fde047;font-weight:bold;">50 cmin</span></div>
        <div class="guide-item">En el 9 (45s) = <span style="color:#fde047;font-weight:bold;">75 cmin</span></div>
      </div>
    </div>
  </div>

  <script>
    // Establecer hora actual por defecto en el campo de clock
    const nowInit = new Date();
    document.getElementById('clockInInput').value = 
      String(nowInit.getHours()).padStart(2, '0') + ':' + String(nowInit.getMinutes()).padStart(2, '0');

    // Dibujar las 100 centésimas exteriores (Amarillo Grande y Notorio)
    const centiGroup = document.getElementById('centiTicks');
    for (let i = 0; i < 100; i++) {
      const angle = (i * 3.6 - 90) * Math.PI / 180;
      const isQuarter = i === 25 || i === 50 || i === 75 || i === 0;
      const isMajor = i % 10 === 0 && !isQuarter;
      const isMid = i % 5 === 0 && !isMajor && !isQuarter;
      const len = isQuarter ? 10 : isMajor ? 7 : isMid ? 4.5 : 2.5;
      const r = 142;
      const x1 = 170 + r * Math.cos(angle);
      const y1 = 170 + r * Math.sin(angle);
      const x2 = 170 + (r - len) * Math.cos(angle);
      const y2 = 170 + (r - len) * Math.sin(angle);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', isQuarter ? '#fde047' : isMajor ? '#fbbf24' : isMid ? '#d97706' : '#78350f');
      line.setAttribute('stroke-width', isQuarter ? '2.5' : isMajor ? '1.8' : '0.8');
      centiGroup.appendChild(line);

      if (isMajor || isQuarter) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 170 + (r - 18) * Math.cos(angle));
        text.setAttribute('y', 170 + (r - 18) * Math.sin(angle) + 4);
        text.setAttribute('fill', isQuarter ? '#fde047' : '#fbbf24');
        text.setAttribute('font-size', isQuarter ? '12.5' : '10');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = i === 0 ? '0' : i;
        centiGroup.appendChild(text);
      }
    }

    // Dibujar 12 horas del reloj de pared
    const hourGroup = document.getElementById('traditionalHours');
    const hours = [12,1,2,3,4,5,6,7,8,9,10,11];
    hours.forEach((h, idx) => {
      const angle = (idx * 30 - 90) * Math.PI / 180;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 170 + 98 * Math.cos(angle));
      text.setAttribute('y', 170 + 98 * Math.sin(angle) + 5.5);
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '15');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = h;
      hourGroup.appendChild(text);
    });

    const pad = (n) => String(n).padStart(2, '0');

    // Reloj en tiempo real
    function updateClock() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const ms = now.getMilliseconds();

      const totalSec = s + ms / 1000;
      const cmin = (totalSec / 60) * 100;

      const hourDeg = ((h % 12) + m / 60) * 30;
      const minDeg = (m + cmin / 100) * 6;
      const centiDeg = cmin * 3.6;

      document.getElementById('hourHand').setAttribute('transform', \`rotate(\${hourDeg} 170 170)\`);
      document.getElementById('minuteHand').setAttribute('transform', \`rotate(\${minDeg} 170 170)\`);
      document.getElementById('centiHand').setAttribute('transform', \`rotate(\${centiDeg} 170 170)\`);

      document.getElementById('tradTime').textContent = \`\${pad(h)}:\${pad(m)}:\${pad(s)}\`;
      document.getElementById('centiTime').textContent = \`\${pad(h)}:\${pad(m)}.\${pad(Math.floor(cmin))} cmin\`;

      requestAnimationFrame(updateClock);
    }
    requestAnimationFrame(updateClock);

    // Cálculo dinámico de la ponchada
    function calculatePunch() {
      const clockInVal = document.getElementById('clockInInput').value || '08:00';
      const [h, m] = clockInVal.split(':').map(Number);
      const minsToAdd = parseInt(document.getElementById('minutesInput').value, 10) || 30;
      const preMins = parseInt(document.getElementById('preAlertInput').value, 10) || 5;

      const startDate = new Date();
      startDate.setHours(h, m, 0, 0);

      const punchDate = new Date(startDate.getTime() + minsToAdd * 60 * 1000);
      const preAlertDate = new Date(punchDate.getTime() - preMins * 60 * 1000);

      const punchSec = punchDate.getSeconds();
      const punchCmin = Math.floor((punchSec / 60) * 100);

      document.getElementById('punchResultTrad').textContent = 
        \`\${pad(punchDate.getHours())}:\${pad(punchDate.getMinutes())}:\${pad(punchSec)}\`;
      document.getElementById('punchResultCenti').textContent = 
        \`\${pad(punchDate.getHours())}:\${pad(punchDate.getMinutes())}.\${pad(punchCmin)} cmin\`;

      document.getElementById('preAlertResultBadge').textContent = 
        \`🔔 Timbre sonará a las \${pad(preAlertDate.getHours())}:\${pad(preAlertDate.getMinutes())} (\${preMins} min antes)\`;

      return { punchDate, preAlertDate };
    }
    calculatePunch();

    // Sistema de sonido Web Audio potente
    let audioCtx = null;
    let alarmTimer = null;
    let preAlertFired = false;
    let sirenInterval = null;

    function getAudioCtx() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function playBeep(freq, type, duration, vol) {
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    }

    function playChimePre() {
      playBeep(880, 'sine', 0.45, 0.9);
      setTimeout(() => playBeep(1174, 'sine', 0.5, 0.95), 220);
      setTimeout(() => playBeep(1318, 'sine', 0.8, 1.0), 450);
      if (navigator.vibrate) navigator.vibrate([250, 100, 300]);
    }

    function startLoudSiren() {
      document.getElementById('stopAlarmBtn').style.display = 'block';
      document.getElementById('startPunchAlarmBtn').style.display = 'none';
      document.getElementById('alarmStatus').textContent = '🚨 ¡ES HORA DE PONCHAR! Alarma sonando fuerte.';

      function pulse() {
        playBeep(950, 'square', 0.2, 0.95);
        setTimeout(() => playBeep(1400, 'square', 0.3, 1.0), 220);
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      }
      pulse();
      sirenInterval = setInterval(pulse, 1000);
    }

    function silenceAlarm() {
      if (sirenInterval) { clearInterval(sirenInterval); sirenInterval = null; }
      document.getElementById('stopAlarmBtn').style.display = 'none';
      document.getElementById('startPunchAlarmBtn').style.display = 'block';
      document.getElementById('alarmStatus').textContent = 'Alarma apagada.';
    }

    function togglePunchAlarm() {
      getAudioCtx();
      const { punchDate, preAlertDate } = calculatePunch();
      preAlertFired = false;
      document.getElementById('alarmStatus').textContent = 'Seguimiento activo. Esperando timbre previo...';

      if (alarmTimer) clearInterval(alarmTimer);
      alarmTimer = setInterval(() => {
        const now = Date.now();
        if (now >= preAlertDate.getTime() && !preAlertFired) {
          preAlertFired = true;
          playChimePre();
          document.getElementById('alarmStatus').textContent = '🔔 ¡TIMBRE DE AVISO! Alístate para ponchar.';
        }
        if (now >= punchDate.getTime()) {
          clearInterval(alarmTimer);
          startLoudSiren();
        }
      }, 500);
    }
  </script>
</body>
</html>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(standaloneHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write error', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([standaloneHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reloj-pared-centecimas.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Código HTML Listo para Tu Sitio Web
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-300">
            Este código es <strong>100% autónomo (Single-File)</strong>. Incluye los <strong>decimales amarillos grandes</strong>, las marcas en paralelo con tu reloj de pared, el <strong>cronómetro ponchador</strong> (donde digitas tu clock, minutos de jornada, aviso previo y te calcula a qué hora debes ponchar), y la alarma que suena bien duro.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopy}
              className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md hover:shadow-amber-500/20 active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Código Copiado al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Código HTML</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Descargar archivo reloj.html</span>
            </button>
          </div>

          {/* Code Viewer */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto">
            <pre><code>{standaloneHtml}</code></pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-900/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
