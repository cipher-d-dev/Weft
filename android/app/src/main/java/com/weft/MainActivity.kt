package com.weft

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
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
        super.onCreate(savedInstanceState)

        // ── Edge-to-edge ──────────────────────────────────────────────────
        // Tell the window that our app will handle all insets manually.
        // This allows React Native content to draw behind the status bar
        // and navigation bar — essential for a launcher that owns the screen.
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // ── Transparent system bars ───────────────────────────────────────
        // Make status bar and navigation bar fully transparent so our
        // WallpaperBackground and per-paradigm surfaces show through.
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        // On Android 10+ (Q), we can also remove the navigation bar scrim
        // that Android 9 and below forced under the nav area.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
            window.isStatusBarContrastEnforced = false
        }

        // ── Remove FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS conflict ────────────
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION)

        // ── Initial icon colors ───────────────────────────────────────────
        // Default to light icons (white) since Weft starts on a dark background.
        // The JS layer updates these on paradigm change via WeftSystemUIModule.
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.isAppearanceLightStatusBars = false       // white status icons
        controller.isAppearanceLightNavigationBars = false   // white nav icons
    }
}
