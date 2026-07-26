package com.weft

import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WeftSystemUIModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WeftSystemUI"
    }

    override fun getName(): String = "WeftSystemUI"

    @ReactMethod
    fun setNavigationBar(colorHex: String, lightIcons: Boolean, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            Log.w(TAG, "setNavigationBar: no current activity")
            promise.resolve(null)
            return
        }

        activity.runOnUiThread {
            try {
                val color = Color.parseColor(colorHex)
                activity.window.navigationBarColor = color

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    activity.window.isNavigationBarContrastEnforced = false
                }

                val controller = WindowInsetsControllerCompat(
                    activity.window,
                    activity.window.decorView
                )
                controller.isAppearanceLightNavigationBars = lightIcons
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "setNavigationBar failed: ${e.message}", e)
                promise.resolve(null)
            }
        }
    }

    @ReactMethod
    fun setStatusBarStyle(lightIcons: Boolean, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(null)
            return
        }

        activity.runOnUiThread {
            try {
                val controller = WindowInsetsControllerCompat(
                    activity.window,
                    activity.window.decorView
                )
                controller.isAppearanceLightStatusBars = lightIcons
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "setStatusBarStyle failed: ${e.message}", e)
                promise.resolve(null)
            }
        }
    }
}
