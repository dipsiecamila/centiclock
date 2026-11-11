/**
 * High-Volume Web Audio Synthesizer for USPS Dolly Clock
 * "Las alarmas y el timbre deben durar hasta que el usuario las apague con Silenciar."
 * Audio stops immediately and completely when stopped.
 */

let audioCtx: AudioContext | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;
let masterGain: GainNode | null = null;
let activeAlertInterval: number | null = null;
let currentAlertType: 'pre' | 'final' | null = null;

// Track all scheduled oscillators and timeouts so they can be canceled instantly
const activeOscillators: OscillatorNode[] = [];
const activeTimeouts: number[] = [];

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();

    masterCompressor = audioCtx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
    masterCompressor.knee.setValueAtTime(10, audioCtx.currentTime);
    masterCompressor.ratio.setValueAtTime(12, audioCtx.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    masterCompressor.release.setValueAtTime(0.15, audioCtx.currentTime);

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

    masterCompressor.connect(masterGain);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Global user interaction listener to unlock AudioContext on first click/touch
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // ignore
    }
  };
  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

function ensureMasterGainActive(ctx: AudioContext) {
  if (masterGain) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
  }
}

function playPiercingTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number = 0.9,
  type: OscillatorType = 'sine'
) {
  try {
    ensureMasterGainActive(ctx);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = type;
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.5, startTime);

    const t0 = Math.max(ctx.currentTime, startTime);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.linearRampToValueAtTime(0.001, t0 + duration);

    const dest = masterCompressor || ctx.destination;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(dest);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + duration);
    osc2.stop(t0 + duration);

    activeOscillators.push(osc1, osc2);

    const cleanupTimeout = window.setTimeout(() => {
      const idx1 = activeOscillators.indexOf(osc1);
      if (idx1 !== -1) activeOscillators.splice(idx1, 1);
      const idx2 = activeOscillators.indexOf(osc2);
      if (idx2 !== -1) activeOscillators.splice(idx2, 1);
    }, (duration + 0.1) * 1000);
    activeTimeouts.push(cleanupTimeout);
  } catch (err) {
    console.warn('Tone play error:', err);
  }
}

/**
 * Single pattern of the pre-alarm chime (Ding-Dong-Ding)
 */
function playPreAlertBurst(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    playPiercingTone(ctx, 880, now, 0.4, 0.85, 'sine');
    playPiercingTone(ctx, 1174.66, now + 0.22, 0.45, 0.9, 'sine');
    playPiercingTone(ctx, 1318.51, now + 0.44, 0.8, 0.95, 'sine');

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([250, 100, 250, 100, 400]);
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * Single pattern of the final loud alarm (Double piercing pulse)
 */
function playLoudAlarmBurst(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    playPiercingTone(ctx, 950, now, 0.18, 0.95, 'square');
    playPiercingTone(ctx, 1400, now + 0.2, 0.22, 1.0, 'square');
    playPiercingTone(ctx, 950, now + 0.45, 0.18, 0.95, 'square');
    playPiercingTone(ctx, 1400, now + 0.65, 0.35, 1.0, 'square');

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * Timbre de aviso previo continuo: Repite hasta que el usuario lo apague
 */
export function startContinuousPreAlert(): void {
  stopAllContinuousAlerts();
  currentAlertType = 'pre';
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
  playPreAlertBurst();
  activeAlertInterval = window.setInterval(() => {
    playPreAlertBurst();
  }, 1800);
}

/**
 * Alarma de meta final continua: Repite bien duro hasta que el usuario la apague
 */
export function startContinuousLoudAlarm(): void {
  stopAllContinuousAlerts();
  currentAlertType = 'final';
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
  playLoudAlarmBurst();
  activeAlertInterval = window.setInterval(() => {
    playLoudAlarmBurst();
  }, 1100);
}

/**
 * Detener cualquier alarma o timbre activo de forma TOTAL e INMEDIATA
 */
export function stopAllContinuousAlerts(): void {
  // 1. Limpiar intervalo de repetición
  if (activeAlertInterval !== null) {
    clearInterval(activeAlertInterval);
    activeAlertInterval = null;
  }
  currentAlertType = null;

  // 2. Limpiar todos los timeouts pendientes
  while (activeTimeouts.length > 0) {
    const tId = activeTimeouts.pop();
    if (tId) clearTimeout(tId);
  }

  // 3. Forzar detención y desconexión inmediata de todos los osciladores activos
  while (activeOscillators.length > 0) {
    const osc = activeOscillators.pop();
    if (osc) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Safe fallback
      }
    }
  }

  // 4. Detener vibración de teléfonos móviles
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch {
      // safe fallback
    }
  }

  // 5. Cortar el sonido en Web Audio inmediatamente a 0
  if (masterGain && audioCtx) {
    try {
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
    } catch {
      // safe fallback
    }
  }
}

export function getCurrentAlertType(): 'pre' | 'final' | null {
  return currentAlertType;
}

export function isAlertActive(): boolean {
  return activeAlertInterval !== null;
}

// Single preview shots for testing buttons
export function playPreAlarmChime(): void {
  stopAllContinuousAlerts();
  playPreAlertBurst();
}

export function playFinalAlarmChime(): void {
  stopAllContinuousAlerts();
  playLoudAlarmBurst();
}

export function playCentiTick(): void {
  try {
    const ctx = getAudioContext();
    ensureMasterGainActive(ctx);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.015);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    const dest = masterCompressor || ctx.destination;
    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}
