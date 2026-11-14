import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 44100;

function writeWavFile(filePath, samplesFloat) {
  const numSamples = samplesFloat.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samplesFloat[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function addTone(samples, startSec, durationSec, freq, amplitude, waveform = 'sine') {
  const startIdx = Math.floor(startSec * SAMPLE_RATE);
  const count = Math.floor(durationSec * SAMPLE_RATE);
  const attack = Math.floor(0.01 * SAMPLE_RATE);
  const release = Math.floor(0.04 * SAMPLE_RATE);

  for (let i = 0; i < count; i++) {
    const idx = startIdx + i;
    if (idx >= samples.length) break;
    const t = i / SAMPLE_RATE;

    let env = 1.0;
    if (i < attack) env = i / attack;
    else if (i > count - release) env = Math.max(0, (count - i) / release);

    const phase = 2 * Math.PI * freq * t;
    const harmonicPhase = 2 * Math.PI * (freq * 1.5) * t;
    let val = 0;
    if (waveform === 'square') {
      const sq = Math.sin(phase) >= 0 ? 1 : -1;
      const tri = (2 / Math.PI) * Math.asin(Math.sin(harmonicPhase));
      val = 0.7 * sq + 0.3 * tri;
    } else {
      val = 0.75 * Math.sin(phase) + 0.25 * (2 / Math.PI) * Math.asin(Math.sin(harmonicPhase));
    }

    samples[idx] = Math.max(-0.98, Math.min(0.98, samples[idx] + val * amplitude * env));
  }
}

function run() {
  const rawDir = path.resolve('android/app/src/main/res/raw');

  // 1. Pre-alert chime (Ding-Dong-Ding, 1.8 seconds loop)
  const preSamples = new Float32Array(Math.floor(1.8 * SAMPLE_RATE));
  addTone(preSamples, 0.0, 0.36, 880, 0.75, 'sine');
  addTone(preSamples, 0.22, 0.40, 1174.66, 0.80, 'sine');
  addTone(preSamples, 0.44, 0.75, 1318.51, 0.85, 'sine');
  writeWavFile(path.join(rawDir, 'pre_alert_chime.wav'), preSamples);
  console.log('✓ android/app/src/main/res/raw/pre_alert_chime.wav generated');

  // 2. Final loud alarm (Piercing double pulse, 1.1 seconds loop)
  const finalSamples = new Float32Array(Math.floor(1.1 * SAMPLE_RATE));
  addTone(finalSamples, 0.0, 0.17, 950, 0.85, 'square');
  addTone(finalSamples, 0.19, 0.21, 1400, 0.90, 'square');
  addTone(finalSamples, 0.44, 0.17, 950, 0.85, 'square');
  addTone(finalSamples, 0.63, 0.32, 1400, 0.90, 'square');
  writeWavFile(path.join(rawDir, 'final_alarm.wav'), finalSamples);
  console.log('✓ android/app/src/main/res/raw/final_alarm.wav generated');
}

run();
