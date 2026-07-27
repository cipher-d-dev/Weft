package com.weft

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * SystemGesturesModule
 *
 * Provides native system-level actions triggered by user gestures:
 *   - expandNotifications() — opens Android notification shade
 *   - expandQuickSettings() — opens quick settings panel
 *   - showRecentApps() — opens recent apps / task switcher
 *
 * These are system APIs with varying availability across Android versions.
 * Methods resolve gracefully if the action is not available.
 */
class SystemGesturesModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SystemGestures"
    }

    override fun getName(): String = "SystemGestures"

    /**
     * Expand the notification shade from the top of the screen.
     * Uses StatusBarManager (requires system permission, may fail on non-system apps).
     */
    @ReactMethod
    fun expandNotifications(promise: Promise) {
        try {
            val statusBarService = reactApplicationContext.getSystemService(
                Context.STATUS_BAR_SERVICE
            )

            if (statusBarService != null) {
                // Use reflection to call expandNotificationsPanel() — internal API
                val method = statusBarService.javaClass.getMethod("expandNotificationsPanel")
                method.invoke(statusBarService)
                promise.resolve(true)
            } else {
                Log.w(TAG, "expandNotifications: STATUS_BAR_SERVICE not available")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "expandNotifications failed: ${e.message}", e)
            promise.resolve(false)
        }
    }

    /**
     * Expand the quick settings panel (Wi-Fi, Bluetooth, etc. toggles).
     */
    @ReactMethod
    fun expandQuickSettings(promise: Promise) {
        try {
            val statusBarService = reactApplicationContext.getSystemService(
                Context.STATUS_BAR_SERVICE
            )

            if (statusBarService != null) {
                val method = statusBarService.javaClass.getMethod("expandSettingsPanel")
                method.invoke(statusBarService)
                promise.resolve(true)
            } else {
                Log.w(TAG, "expandQuickSettings: STATUS_BAR_SERVICE not available")
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "expandQuickSettings failed: ${e.message}", e)
            promise.resolve(false)
        }
    }

    /**
     * Show the recent apps / task switcher.
     * Uses ActivityManager.getRecentTasks() on older APIs, intent on newer ones.
     */
    @ReactMethod
    fun showRecentApps(promise: Promise) {
        try {
            // Attempt to use the Android 11+ intent to toggle recents
            // This is a semi-hidden API that may work on some devices
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    val intent = Intent("com.android.systemui.recent.action.TOGGLE_RECENTS")
                    intent.setPackage("com.android.systemui")
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(true)
                    return
                } catch (e: Exception) {
                    Log.w(TAG, "showRecentApps: toggle recents intent failed, trying fallback", e)
                }
            }

            // Fallback: use ActivityManager.moveTaskToFront with the previous task
            // This doesn't open the switcher UI but cycles to the previous app
            val activityManager = reactApplicationContext.getSystemService(
                Context.ACTIVITY_SERVICE
            ) as? ActivityManager

            if (activityManager != null) {
                val tasks = activityManager.getRecentTasks(2, 0)
                if (tasks.size >= 2) {
                    // tasks[0] is the current task (Weft), tasks[1] is the previous app
                    val previousTask = tasks[1]
                    activityManager.moveTaskToFront(previousTask.id, 0)
                    promise.resolve(true)
                    return
                }
            }

            Log.w(TAG, "showRecentApps: no fallback available")
            promise.resolve(false)
        } catch (e: Exception) {
            Log.e(TAG, "showRecentApps failed: ${e.message}", e)
            promise.resolve(false)
        }
    }
}
