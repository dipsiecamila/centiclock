/**
 * Utility functions for USPS Dolly Clock & Time Recorder Calculations
 *
 * En este reloj de ponchador (USPS Dolly Clock / Industrial Time Clock):
 * - Las HORAS se dividen entre 100 (centésimas de hora / tics / hundredths).
 * - 1 hora = 60 minutos = 100 centésimas de hora (tics).
 * - 1 tic = 0.6 minutos = 36 segundos.
 * - NO se usan segundos en este reloj de ponchador (formato: HH.cc tics).
 * - En el reloj normal de pared SÍ se usan y se muestran los segundos (formato: HH:MM:SS).
 */

export interface CentiTime {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;

  // Centésimas de HORA (0.00 - 99.99 tics dentro de la hora actual)
  centiHoursFloat: number;
  centiHoursInt: number;
  centiHoursFormatted: string;

  // Formato Ponchador USPS: HH.cc tics (sin segundos, hora dividida en 100)
  punchClockFormatted: string;

  // Formato Reloj Normal de Pared: HH:MM:SS (con segundos)
  traditionalFormatted: string;

  // Formato tradicional corto: HH:MM
  traditionalShort: string;

  // Hora decimal industrial total (ej: 14.50 h)
  decimalHour: number;

  // Compatibilidad anterior
  centiminutesFloat: number;
  centiminutesInt: number;
  centiminutesFormatted: string;
  centiFormatted: string;
}

export function calculateCentiTime(date: Date = new Date()): CentiTime {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Cálculo de CENTÉSIMAS DE HORA (dividir la hora en 100)
  // 1 hora = 60 minutos = 3600 segundos
  const totalSecondsInHour = minutes * 60 + seconds + milliseconds / 1000;
  const centiHoursFloat = (totalSecondsInHour / 3600) * 100;
  const centiHoursInt = Math.min(99, Math.floor(centiHoursFloat));
  const centiHoursFormatted = pad(centiHoursInt);

  // Formato Ponchador: HH.cc (ej: 08.50)
  const punchClockFormatted = `${pad(hours)}.${centiHoursFormatted}`;

  // Formato Normal con segundos: HH:MM:SS
  const traditionalFormatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const traditionalShort = `${pad(hours)}:${pad(minutes)}`;

  const decimalHour = hours + centiHoursFloat / 100;

  // Compatibilidad de centiminutos (segundos / 60 * 100)
  const totalSecondsInMinute = seconds + milliseconds / 1000;
  const centiminutesFloat = (totalSecondsInMinute / 60) * 100;
  const centiminutesInt = Math.min(99, Math.floor(centiminutesFloat));
  const centiminutesFormatted = pad(centiminutesInt);
  const centiFormatted = `${pad(hours)}:${pad(minutes)}.${centiminutesFormatted}`;

  return {
    hours,
    minutes,
    seconds,
    milliseconds,
    centiHoursFloat,
    centiHoursInt,
    centiHoursFormatted,
    punchClockFormatted,
    traditionalFormatted,
    traditionalShort,
    decimalHour,
    centiminutesFloat,
    centiminutesInt,
    centiminutesFormatted,
    centiFormatted,
  };
}

/**
 * Convierte minutos a tics (centésimas de hora)
 * Ejemplo: 30 min = 50 tics, 15 min = 25 tics, 60 min = 100 tics
 */
export function minutesToTics(minutes: number): number {
  return (minutes / 60) * 100;
}

/**
 * Convierte tics (centésimas de hora) a minutos
 * Ejemplo: 50 tics = 30 min, 25 tics = 15 min
 */
export function ticsToMinutes(tics: number): number {
  return (tics / 100) * 60;
}

/**
 * Formato de duración en ms
 */
export function formatDurationMs(ms: number): {
  traditional: string;
  centiminute: string;
  totalSeconds: number;
  totalCentiminutes: number;
} {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const sign = isNegative ? '-' : '';

  const traditional = hours > 0
    ? `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${sign}${pad(minutes)}:${pad(seconds)}`;

  const totalTics = (absMs / 1000 / 3600) * 100;
  const centiminute = `${sign}${totalTics.toFixed(2)} tics`;

  return {
    traditional,
    centiminute,
    totalSeconds,
    totalCentiminutes: totalTics,
  };
}

export interface FutureProjection {
  offsetMinutes: number;
  label: string;
  targetDate: Date;
  preAlertDate: Date;
  targetTraditional: string;
  targetCenti: string;
  preAlertTraditional: string;
  preAlertCenti: string;
}

export function computeProjection(
  now: Date,
  offsetMinutes: number,
  preAlertMinutesBefore: number = 5,
  label: string = `+${offsetMinutes} min`
): FutureProjection {
  const targetDate = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const preAlertDate = new Date(targetDate.getTime() - preAlertMinutesBefore * 60 * 1000);

  const targetCalc = calculateCentiTime(targetDate);
  const preAlertCalc = calculateCentiTime(preAlertDate);

  return {
    offsetMinutes,
    label,
    targetDate,
    preAlertDate,
    targetTraditional: targetCalc.traditionalFormatted,
    targetCenti: `${targetCalc.punchClockFormatted} tics`,
    preAlertTraditional: preAlertCalc.traditionalFormatted,
    preAlertCenti: `${preAlertCalc.punchClockFormatted} tics`,
  };
}
