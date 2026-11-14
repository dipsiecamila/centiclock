package com.usps.dollyclock;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DollyAlarm")
public class DollyAlarmPlugin extends Plugin {
    private static volatile DollyAlarmPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    public static void notifyAlarmTriggered(String type, long targetMs) {
        DollyAlarmPlugin plugin = instance;
        if (plugin != null) {
            JSObject data = new JSObject();
            data.put("type", type != null ? type : "final");
            data.put("targetMs", targetMs);
            plugin.notifyListeners("alarmTriggered", data, true);
        }
    }

    public static void notifyAlarmStopped(String type, long targetMs) {
        DollyAlarmPlugin plugin = instance;
        if (plugin != null) {
            JSObject data = new JSObject();
            data.put("type", type != null ? type : "final");
            data.put("targetMs", targetMs);
            plugin.notifyListeners("alarmStopped", data, true);
        }
    }

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        long preTargetMs = call.getData().optLong("preTargetMs", 0L);
        long finalTargetMs = call.getData().optLong("finalTargetMs", 0L);
        int preAlertMinutes = call.getData().optInt("preAlertMinutes", 5);
        String punchCentiFormatted = call.getString("punchCentiFormatted", "");
        String lang = call.getString("lang", "es");

        DollyAlarmScheduler.scheduleAlarms(
                getContext(),
                preTargetMs,
                finalTargetMs,
                preAlertMinutes,
                punchCentiFormatted,
                lang
        );

        JSObject ret = new JSObject();
        ret.put("scheduled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAlarms(PluginCall call) {
        DollyAlarmScheduler.cancelAllAlarms(getContext());
        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        Context ctx = getContext();
        Intent stopIntent = new Intent(ctx, AlarmForegroundService.class);
        stopIntent.setAction(AlarmForegroundService.ACTION_STOP_ALARM);
        try {
            ctx.startService(stopIntent);
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("stopped", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getActiveAlarm(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(DollyAlarmScheduler.PREFS_NAME, Context.MODE_PRIVATE);
        String activeType = AlarmForegroundService.activeAlarmType;
        long activeTargetMs = AlarmForegroundService.activeTargetMs;

        JSObject ret = new JSObject();
        ret.put("isActive", activeType != null);
        ret.put("type", activeType);
        ret.put("targetMs", activeTargetMs);
        ret.put("lastStoppedPreMs", prefs.getLong(DollyAlarmScheduler.KEY_LAST_STOPPED_PRE_MS, 0L));
        ret.put("lastStoppedFinalMs", prefs.getLong(DollyAlarmScheduler.KEY_LAST_STOPPED_FINAL_MS, 0L));
        call.resolve(ret);
    }

    @PluginMethod
    public void checkAlarmPermissions(PluginCall call) {
        Context ctx = getContext();
        boolean canScheduleExact = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            canScheduleExact = am == null || am.canScheduleExactAlarms();
        }

        boolean ignoringBatteryOptimizations = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            ignoringBatteryOptimizations = pm == null || pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
        }

        JSObject ret = new JSObject();
        ret.put("canScheduleExact", canScheduleExact);
        ret.put("ignoringBatteryOptimizations", ignoringBatteryOptimizations);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        Context ctx = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(ctx.getPackageName())) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                }
            }
        } catch (Exception ignored) {}
        call.resolve();
    }
}
