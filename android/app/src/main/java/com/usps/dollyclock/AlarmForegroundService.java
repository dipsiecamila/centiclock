package com.usps.dollyclock;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class AlarmForegroundService extends Service {
    public static final String ACTION_START_ALARM = "com.usps.dollyclock.ACTION_START_ALARM";
    public static final String ACTION_STOP_ALARM = "com.usps.dollyclock.ACTION_STOP_ALARM";
    public static final String CHANNEL_ID = "usps_dolly_alarm_service_v1";
    public static final int SERVICE_NOTIF_ID = 3001;
    private static final long SAFETY_AUTO_STOP_MS = 90 * 1000L;

    public static volatile String activeAlarmType = null;
    public static volatile long activeTargetMs = 0L;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable autoStopRunnable = this::stopAlarmAndSelf;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP_ALARM.equals(action)) {
            stopAlarmAndSelf();
            return START_NOT_STICKY;
        }

        String type = intent != null ? intent.getStringExtra("type") : "final";
        if (type == null || type.isEmpty()) type = "final";
        String title = intent != null ? intent.getStringExtra("title") : null;
        String body = intent != null ? intent.getStringExtra("body") : null;
        long targetMs = intent != null ? intent.getLongExtra("targetMs", 0L) : 0L;

        if (title == null || title.isEmpty()) {
            title = "final".equals(type) ? "🚨 ¡HORA DE PONCHAR!" : "🔔 ¡TIMBRE DE AVISO!";
        }
        if (body == null || body.isEmpty()) {
            body = "Presiona DETENER / STOP para apagar la alarma.";
        }

        startAlarmNow(type, title, body, targetMs);
        return START_NOT_STICKY;
    }

    private void startAlarmNow(String type, String title, String body, long targetMs) {
        stopMediaAndVibrationOnly();

        activeAlarmType = type;
        activeTargetMs = targetMs;

        createNotificationChannel();

        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        fullScreenIntent.putExtra("alarmType", type);
        fullScreenIntent.putExtra("alarmTargetMs", targetMs);
        fullScreenIntent.putExtra("fromAlarmNotification", true);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this,
                3010,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, AlarmForegroundService.class);
        stopIntent.setAction(ACTION_STOP_ALARM);
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this,
                3011,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_alarm)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(fullScreenPendingIntent)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .addAction(0, "🛑 DETENER / STOP", stopPendingIntent);

        Notification notification = builder.build();
        notification.flags |= Notification.FLAG_INSISTENT | Notification.FLAG_NO_CLEAR;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(SERVICE_NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(SERVICE_NOTIF_ID, notification);
        }

        acquireWakeLock();
        startLoopingSound(type);
        startLoopingVibration();

        handler.removeCallbacks(autoStopRunnable);
        handler.postDelayed(autoStopRunnable, SAFETY_AUTO_STOP_MS);

        DollyAlarmPlugin.notifyAlarmTriggered(type, targetMs);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Alarmas Activas USPS Dolly Clock",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alarma continua de ponchada que suena incluso en segundo plano");
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.enableLights(true);
            channel.enableVibration(false); // Service controls continuous vibration directly
            channel.setSound(null, null);     // Service controls continuous USAGE_ALARM MediaPlayer directly
            channel.setBypassDnd(true);
            nm.createNotificationChannel(channel);
        }
    }

    @SuppressWarnings("deprecation")
    private void acquireWakeLock() {
        releaseWakeLock();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK
                            | PowerManager.ACQUIRE_CAUSES_WAKEUP
                            | PowerManager.ON_AFTER_RELEASE,
                    "USPSDollyClock:AlarmServiceWakeLock"
            );
            wakeLock.acquire(SAFETY_AUTO_STOP_MS + 5000L);
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
        }
        wakeLock = null;
    }

    private void startLoopingSound(String type) {
        try {
            int rawResId = "pre".equals(type) ? R.raw.pre_alert_chime : R.raw.final_alarm;
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + rawResId);

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            mediaPlayer.setDataSource(getApplicationContext(), soundUri);
            mediaPlayer.setLooping(true);
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            try {
                Uri fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (fallback == null) {
                    fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                }
                if (fallback != null) {
                    mediaPlayer = new MediaPlayer();
                    mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build());
                    mediaPlayer.setDataSource(getApplicationContext(), fallback);
                    mediaPlayer.setLooping(true);
                    mediaPlayer.prepare();
                    mediaPlayer.start();
                }
            } catch (Exception ignored) {}
        }
    }

    @SuppressWarnings("deprecation")
    private void startLoopingVibration() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    vibrator = vm.getDefaultVibrator();
                }
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = new long[]{0, 350, 150, 350, 150, 500, 400};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                } else {
                    vibrator.vibrate(pattern, 0);
                }
            }
        } catch (Exception ignored) {}
    }

    private void stopMediaAndVibrationOnly() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (Exception ignored) {}
            try {
                mediaPlayer.reset();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Exception ignored) {}
            vibrator = null;
        }
    }

    private void stopAlarmAndSelf() {
        handler.removeCallbacks(autoStopRunnable);

        String stoppedType = activeAlarmType;
        long stoppedTargetMs = activeTargetMs;

        if (stoppedType != null && stoppedTargetMs > 0L) {
            SharedPreferences prefs = getSharedPreferences(DollyAlarmScheduler.PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            if ("pre".equals(stoppedType)) {
                editor.putLong(DollyAlarmScheduler.KEY_LAST_STOPPED_PRE_MS, stoppedTargetMs);
            } else {
                editor.putLong(DollyAlarmScheduler.KEY_LAST_STOPPED_FINAL_MS, stoppedTargetMs);
            }
            editor.apply();
        }

        activeAlarmType = null;
        activeTargetMs = 0L;

        stopMediaAndVibrationOnly();
        releaseWakeLock();

        try {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } catch (Exception ignored) {}

        DollyAlarmPlugin.notifyAlarmStopped(stoppedType, stoppedTargetMs);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(autoStopRunnable);
        activeAlarmType = null;
        activeTargetMs = 0L;
        stopMediaAndVibrationOnly();
        releaseWakeLock();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
