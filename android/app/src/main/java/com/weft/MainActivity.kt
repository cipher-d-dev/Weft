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
        // Do NOT call setTheme() here — keep SplashTheme (with its
        // windowBackground pointing at splash_background.xml / splash_logo)
        // visible until React Native renders its first frame.
        //
        // AppTheme is applied after React Native's content view is attached
        // via onWindowFocusChanged, which fires once the JS bundle is ready
        // and RN has drawn at least one frame.  This keeps the branded splash
        // on-screen instead of the default white/transparent window.
        //
        // Note: super.onCreate() is called with SplashTheme still active.

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

    // ── Splash dismiss — clear the splash windowBackground once RN has focus ──
    // onWindowFocusChanged fires when the window becomes interactive, which is
    // after React Native has rendered at least one frame.  At that point we
    // switch to AppTheme and clear the window background so the wallpaper/RN
    // surface shows through cleanly.
    private var splashDismissed = false

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && !splashDismissed) {
            splashDismissed = true
            setTheme(R.style.AppTheme)
            // Clear the window background so the RN transparent surface shows
            window.setBackgroundDrawable(null)
        }
    }
}
