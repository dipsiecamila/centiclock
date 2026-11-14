package com.usps.dollyclock;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class DollyAlarmScheduler {
    public static final String PREFS_NAME = "DollyAlarmPrefs";
    public static final String KEY_PRE_TARGET_MS = "pre_target_ms";
    public static final String KEY_FINAL_TARGET_MS = "final_target_ms";
    public static final String KEY_PRE_MINUTES = "pre_minutes";
    public static final String KEY_PUNCH_FORMATTED = "punch_formatted";
    public static final String KEY_LANG = "lang";
    public static final String KEY_LAST_STOPPED_PRE_MS = "last_stopped_pre_ms";
    public static final String KEY_LAST_STOPPED_FINAL_MS = "last_stopped_final_ms";

    public static final int REQ_CODE_PRE = 2001;
    public static final int REQ_CODE_FINAL = 2002;

    public static void scheduleAlarms(
            Context context,
            long preTargetMs,
            long finalTargetMs,
            int preAlertMinutes,
            String punchCentiFormatted,
            String lang
    ) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putLong(KEY_PRE_TARGET_MS, preTargetMs)
                .putLong(KEY_FINAL_TARGET_MS, finalTargetMs)
                .putInt(KEY_PRE_MINUTES, preAlertMinutes)
                .putString(KEY_PUNCH_FORMATTED, punchCentiFormatted != null ? punchCentiFormatted : "")
                .putString(KEY_LANG, lang != null ? lang : "es")
                .apply();

        cancelPendingIntents(context);

        long now = System.currentTimeMillis();
        boolean isEs = !"en".equalsIgnoreCase(lang);

        if (preAlertMinutes > 0 && preTargetMs > now) {
            String title = isEs
                    ? "🔔 ¡TIMBRE DE AVISO (" + preAlertMinutes + " MIN)!"
                    : "🔔 PRE-ALERT CHIME (" + preAlertMinutes + " MIN)!";
            String body = isEs
                    ? "Faltan " + preAlertMinutes + " minutos para ponchar. Meta: " + punchCentiFormatted + " tics."
                    : preAlertMinutes + " minutes until punch out. Target: " + punchCentiFormatted + " tics.";

            scheduleExactAlarmClock(context, REQ_CODE_PRE, preTargetMs, "pre", title, body, punchCentiFormatted, preAlertMinutes);
        }

        if (finalTargetMs > now) {
            String title = isEs
                    ? "🚨 ¡HORA DE PONCHAR! (STOP)"
                    : "🚨 TIME TO PUNCH OUT! (STOP)";
            String body = isEs
                    ? "¡Debes ponchar ahora mismo! (" + punchCentiFormatted + " tics). Presiona DETENER."
                    : "Punch out right now! (" + punchCentiFormatted + " tics). Press STOP.";

            scheduleExactAlarmClock(context, REQ_CODE_FINAL, finalTargetMs, "final", title, body, punchCentiFormatted, preAlertMinutes);
        }
    }

    public static void rescheduleFromPrefs(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long preTargetMs = prefs.getLong(KEY_PRE_TARGET_MS, 0L);
        long finalTargetMs = prefs.getLong(KEY_FINAL_TARGET_MS, 0L);
        int preAlertMinutes = prefs.getInt(KEY_PRE_MINUTES, 5);
        String punchFormatted = prefs.getString(KEY_PUNCH_FORMATTED, "");
        String lang = prefs.getString(KEY_LANG, "es");

        long now = System.currentTimeMillis();
        if (preTargetMs > now || finalTargetMs > now) {
            scheduleAlarms(context, preTargetMs, finalTargetMs, preAlertMinutes, punchFormatted, lang);
        }
    }

    public static void cancelAllAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .remove(KEY_PRE_TARGET_MS)
                .remove(KEY_FINAL_TARGET_MS)
                .apply();
        cancelPendingIntents(context);
    }

    private static void cancelPendingIntents(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        PendingIntent prePi = buildReceiverPendingIntent(context, REQ_CODE_PRE, "pre", "", "", "", 0, PendingIntent.FLAG_NO_CREATE);
        if (prePi != null) {
            alarmManager.cancel(prePi);
            prePi.cancel();
        }

        PendingIntent finalPi = buildReceiverPendingIntent(context, REQ_CODE_FINAL, "final", "", "", "", 0, PendingIntent.FLAG_NO_CREATE);
        if (finalPi != null) {
            alarmManager.cancel(finalPi);
            finalPi.cancel();
        }
    }

    private static void scheduleExactAlarmClock(
            Context context,
            int requestCode,
            long triggerAtMillis,
            String type,
            String title,
            String body,
            String punchFormatted,
            int preMinutes
    ) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        PendingIntent operation = buildReceiverPendingIntent(
                context,
                requestCode,
                type,
                title,
                body,
                punchFormatted,
                preMinutes,
                PendingIntent.FLAG_UPDATE_CURRENT
        );

        Intent showIntent = new Intent(context, MainActivity.class);
        showIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent showPendingIntent = PendingIntent.getActivity(
                context,
                requestCode + 100,
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(triggerAtMillis, showPendingIntent);
            alarmManager.setAlarmClock(alarmClockInfo, operation);
        } catch (SecurityException se) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
                }
            } catch (Exception ignored) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
                } else {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, operation);
                }
            }
        }
    }

    private static PendingIntent buildReceiverPendingIntent(
            Context context,
            int requestCode,
            String type,
            String title,
            String body,
            String punchFormatted,
            int preMinutes,
            int extraFlags
    ) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("com.usps.dollyclock.ACTION_TRIGGER_ALARM_" + type.toUpperCase());
        intent.putExtra("type", type);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("punchFormatted", punchFormatted);
        intent.putExtra("preMinutes", preMinutes);
        intent.putExtra("targetMs", type.equals("pre")
                ? context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getLong(KEY_PRE_TARGET_MS, 0L)
                : context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getLong(KEY_FINAL_TARGET_MS, 0L));

        return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                extraFlags | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
