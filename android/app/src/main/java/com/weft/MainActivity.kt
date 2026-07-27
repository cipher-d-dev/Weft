package com.weft

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "weft"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        // ── Splash → App theme swap ───────────────────────────────────────
        // Set the theme to AppTheme before super.onCreate so the splash
        // windowBackground (set in AndroidManifest via android:theme="@style/SplashTheme")
        // is replaced before React Native draws its first frame.
        // This gives us: SplashTheme (dark bg / logo) → AppTheme (transparent)
        // with zero white flash.
        setTheme(R.style.AppTheme)

        super.onCreate(savedInstanceState)

        // ── Edge-to-edge ──────────────────────────────────────────────────
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // ── Transparent system bars ───────────────────────────────────────
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
            window.isStatusBarContrastEnforced = false
        }

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION)

        // ── Initial icon colors ───────────────────────────────────────────
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.isAppearanceLightStatusBars = false
        controller.isAppearanceLightNavigationBars = false
    }
}
