package com.weft

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import java.util.concurrent.ConcurrentHashMap

/**
 * NotificationBadgeModule
 *
 * React Native bridge that exposes per-package unread notification counts to JS.
 *
 * Architecture:
 * - WeftNotificationListener is a NotificationListenerService that runs in the
 *   same process and keeps a live ConcurrentHashMap of package → count.
 * - NotificationBadgeModule reads from that shared map.
 * - JS calls getNotificationCounts() to get a snapshot, and clearBadge(pkg)
 *   to cancel all notifications for a package (fires when user opens the app).
 *
 * Permission:
 * - Requires the user to grant "Notification access" in
 *   Settings → Apps → Special app access → Notification access.
 * - isListenerEnabled() lets JS check before showing a prompt.
 */
class NotificationBadgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NotificationBadge"

    /**
     * Returns a map of { packageName: count } for all packages with active
     * notifications. Packages with zero notifications are omitted.
     */
    @ReactMethod
    fun getNotificationCounts(promise: Promise) {
        try {
            val map = WritableNativeMap()
            WeftNotificationListener.counts.forEach { (pkg, count) ->
                if (count > 0) map.putInt(pkg, count)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("BADGE_ERROR", e.message, e)
        }
    }

    /**
     * Clears the in-memory badge count for a specific package.
     * Call this when the user opens an app so the badge disappears.
     */
    @ReactMethod
    fun clearBadge(packageName: String, promise: Promise) {
        WeftNotificationListener.counts.remove(packageName)
        promise.resolve(null)
    }

    /**
     * Returns true if the notification listener service is enabled.
     * JS should check this and prompt the user to grant access if false.
     */
    @ReactMethod
    fun isListenerEnabled(promise: Promise) {
        try {
            val flat = Settings.Secure.getString(
                reactContext.contentResolver,
                "enabled_notification_listeners"
            ) ?: ""
            val component = ComponentName(reactContext, WeftNotificationListener::class.java)
                .flattenToString()
            promise.resolve(flat.contains(component))
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Opens the system Notification Access settings screen so the user can
     * grant permission. Call this after isListenerEnabled() returns false.
     */
    @ReactMethod
    fun openNotificationAccessSettings(promise: Promise) {
        try {
            val intent = android.content.Intent(
                Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
            ).apply {
                addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }
}

/**
 * WeftNotificationListener
 *
 * NotificationListenerService that maintains a live ConcurrentHashMap of
 * package → active notification count. Runs in the Weft process.
 *
 * The shared `counts` map is read by NotificationBadgeModule on the JS thread.
 * ConcurrentHashMap is used so reads/writes from different threads are safe
 * without explicit locking.
 */
class WeftNotificationListener : NotificationListenerService() {

    companion object {
        /** package → count of active (not cleared) notifications */
        val counts: ConcurrentHashMap<String, Int> = ConcurrentHashMap()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val pkg = sbn.packageName ?: return
        // Recount from the live list to stay accurate
        rebuildCounts()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        rebuildCounts()
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        rebuildCounts()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        counts.clear()
    }

    /**
     * Rebuilds the counts map from the current live notification list.
     * Excludes ongoing/foreground-service notifications (isOngoing) as
     * those are system/media notifications rather than unread messages.
     */
    private fun rebuildCounts() {
        try {
            val active = activeNotifications ?: return
            val fresh = ConcurrentHashMap<String, Int>()
            for (sbn in active) {
                if (sbn.isOngoing) continue          // skip foreground service notifs
                val pkg = sbn.packageName ?: continue
                fresh[pkg] = (fresh[pkg] ?: 0) + 1
            }
            counts.clear()
            counts.putAll(fresh)
        } catch (_: Exception) {
            // Service may not be connected yet — ignore
        }
    }
}
