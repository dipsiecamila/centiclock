/**
 * Native Android & Web Background Alarm Manager for USPS Dolly Clock
 *
 * Uses custom Android DollyAlarmPlugin (AlarmManager.setAlarmClock + AlarmForegroundService)
 * on native Android so that:
 * 1. Alarms continue reliably in background, when phone is locked, or even if Android pauses WebView.
 * 2. Uses exact AlarmClockInfo (highest priority wake-up, bypasses Doze mode).
 * 3. Plays continuous loud alarm audio on USAGE_ALARM + continuous vibration + wake lock.
 * 4. Shows high-priority full-screen lockscreen notification with "🛑 DETENER / STOP" button.
 */

import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { stopAllContinuousAlerts } from './audioAlerts';

export interface ActiveAlarmState {
  isActive: boolean;
  type: 'pre' | 'final' | null;
  targetMs: number;
  lastStoppedPreMs: number;
  lastStoppedFinalMs: number;
}

interface DollyAlarmPluginInterface {
  scheduleAlarms(options: {
    preTargetMs: number;
    finalTargetMs: number;
    preAlertMinutes: number;
    punchCentiFormatted: string;
    lang: string;
  }): Promise<{ scheduled: boolean }>;
  cancelAlarms(): Promise<{ cancelled: boolean }>;
  stopAlarm(): Promise<{ stopped: boolean }>;
  getActiveAlarm(): Promise<ActiveAlarmState>;
  checkAlarmPermissions(): Promise<{
    canScheduleExact: boolean;
    ignoringBatteryOptimizations: boolean;
  }>;
  requestBatteryOptimizationExemption(): Promise<void>;
  addListener(
    eventName: 'alarmTriggered' | 'alarmStopped',
    listenerFunc: (data: { type: 'pre' | 'final'; targetMs: number }) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const DollyAlarm = registerPlugin<DollyAlarmPluginInterface>('DollyAlarm');

let screenWakeLock: any = null;
let listenersInitialized = false;

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Request necessary permissions from Android and register native alarm event listeners
 */
export async function setupAlarmSystem(callbacks?: {
  onAlarmTriggered?: (type: 'pre' | 'final', targetMs: number) => void;
  onStopAlarm?: (type?: 'pre' | 'final', targetMs?: number) => void;
}): Promise<boolean> {
  if (!isNativeAndroid()) {
    return false;
  }

  try {
    // Request POST_NOTIFICATIONS permission on Android 13+ via Capacitor LocalNotifications
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions().catch(() => {});
    }

    if (!listenersInitialized) {
      listenersInitialized = true;
      await DollyAlarm.removeAllListeners().catch(() => {});

      await DollyAlarm.addListener('alarmTriggered', (data) => {
        if (callbacks?.onAlarmTriggered) {
          callbacks.onAlarmTriggered(data.type || 'final', data.targetMs || 0);
        }
      });

      await DollyAlarm.addListener('alarmStopped', (data) => {
        stopAllContinuousAlerts();
        releaseWakeLock();
        if (callbacks?.onStopAlarm) {
          callbacks.onStopAlarm(data.type, data.targetMs);
        }
      });
    }

    return true;
  } catch (err) {
    console.warn('Error setting up native alarm system:', err);
    return false;
  }
}

/**
 * Schedule native background exact alarms via Android AlarmManager.setAlarmClock
 */
export async function scheduleNativeAlarms(options: {
  preAlertMs: number;
  punchMs: number;
  preAlertMinutes: number;
  punchCentiFormatted: string;
  lang: 'es' | 'en';
}): Promise<void> {
  if (!isNativeAndroid()) return;

  try {
    await DollyAlarm.scheduleAlarms({
      preTargetMs: options.preAlertMinutes > 0 ? options.preAlertMs : 0,
      finalTargetMs: options.punchMs,
      preAlertMinutes: options.preAlertMinutes,
      punchCentiFormatted: options.punchCentiFormatted,
      lang: options.lang,
    });
  } catch (err) {
    console.warn('Could not schedule native background alarms:', err);
  }
}

/**
 * Cancel all scheduled background alarms
 */
export async function cancelNativeAlarms(): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await DollyAlarm.cancelAlarms();
  } catch {
    // Safe fallback
  }
}

/**
 * Stop currently ringing native foreground alarm service immediately
 */
export async function stopNativeAlarm(): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await DollyAlarm.stopAlarm();
  } catch {
    // Safe fallback
  }
}

/**
 * Query whether a native background alarm is currently ringing or was recently stopped while in background
 */
export async function getNativeActiveAlarmState(): Promise<ActiveAlarmState | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await DollyAlarm.getActiveAlarm();
  } catch {
    return null;
  }
}

/**
 * Request Screen WakeLock so screen stays on while alarm is ringing
 */
export async function acquireWakeLock(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !screenWakeLock) {
      screenWakeLock = await (navigator as any).wakeLock.request('screen');
      screenWakeLock.addEventListener('release', () => {
        screenWakeLock = null;
      });
    }
  } catch {
    // Screen WakeLock may be rejected if page isn't visible, which is expected
  }
}

/**
 * Release Screen WakeLock
 */
export function releaseWakeLock(): void {
  try {
    if (screenWakeLock) {
      screenWakeLock.release();
      screenWakeLock = null;
    }
  } catch {
    // ignore
  }
}
