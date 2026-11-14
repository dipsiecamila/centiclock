package com.usps.dollyclock;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import androidx.core.content.ContextCompat;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = null;
        if (pm != null) {
            wl = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "USPSDollyClock:AlarmReceiverWakeLock"
            );
            wl.acquire(15 * 1000L);
        }

        try {
            Intent serviceIntent = new Intent(context, AlarmForegroundService.class);
            serviceIntent.setAction(AlarmForegroundService.ACTION_START_ALARM);
            if (intent != null) {
                serviceIntent.putExtra("type", intent.getStringExtra("type"));
                serviceIntent.putExtra("title", intent.getStringExtra("title"));
                serviceIntent.putExtra("body", intent.getStringExtra("body"));
                serviceIntent.putExtra("punchFormatted", intent.getStringExtra("punchFormatted"));
                serviceIntent.putExtra("preMinutes", intent.getIntExtra("preMinutes", 5));
                serviceIntent.putExtra("targetMs", intent.getLongExtra("targetMs", 0L));
            }
            ContextCompat.startForegroundService(context, serviceIntent);
        } finally {
            if (wl != null && wl.isHeld()) {
                try {
                    wl.release();
                } catch (Exception ignored) {}
            }
        }
    }
}
