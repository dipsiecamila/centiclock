package com.usps.dollyclock;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DollyAlarmPlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }

        applySafeSystemBarsInsets();
    }

    @Override
    public void onResume() {
        super.onResume();
        ViewCompat.requestApplyInsets(getWindow().getDecorView());
    }

    private void applySafeSystemBarsInsets() {
        Window window = getWindow();
        int bgColor = Color.parseColor("#070a11");

        WindowCompat.setDecorFitsSystemWindows(window, false);

        View decorView = window.getDecorView();
        decorView.setBackgroundColor(bgColor);

        if (Build.VERSION.SDK_INT < 35) {
            window.setStatusBarColor(bgColor);
            window.setNavigationBarColor(bgColor);
        }

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        View webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.getParent() instanceof View) {
            ((View) webView.getParent()).setBackgroundColor(bgColor);
        }

        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            boolean keyboardVisible = windowInsets.isVisible(WindowInsetsCompat.Type.ime());
            int bottomMargin = keyboardVisible ? Math.max(bars.bottom, ime.bottom) : bars.bottom;

            View wv = getBridge() != null ? getBridge().getWebView() : null;
            if (wv != null && wv.getLayoutParams() instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) wv.getLayoutParams();
                if (lp.leftMargin != bars.left
                        || lp.topMargin != bars.top
                        || lp.rightMargin != bars.right
                        || lp.bottomMargin != bottomMargin) {
                    lp.setMargins(bars.left, bars.top, bars.right, bottomMargin);
                    wv.setLayoutParams(lp);
                }
            }

            return new WindowInsetsCompat.Builder(windowInsets)
                    .setInsets(
                            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(),
                            Insets.of(0, 0, 0, 0)
                    )
                    .build();
        });

        ViewCompat.requestApplyInsets(decorView);
    }
}
