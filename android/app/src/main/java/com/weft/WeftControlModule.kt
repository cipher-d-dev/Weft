package com.weft

import android.app.NotificationManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

/**
 * WeftControlModule
 *
 * Native bridge for system-level toggle and slider controls used by
 * ControlCenterScreen. Exposes:
 *
 *   Reads (all return a WritableMap { value: ... }):
 *     getBrightness()     → 0.0–1.0 Float
 *     getVolume()         → 0.0–1.0 Float (STREAM_MUSIC)
 *     getWifiEnabled()    → Boolean
 *     getBluetoothEnabled() → Boolean
 *     getDndEnabled()     → Boolean
 *     getFlashlightOn()   → Boolean (always false — state is write-only on Android)
 *     getAirplaneModeOn() → Boolean
 *
 *   Writes:
 *     setBrightness(value: Float)   — requires WRITE_SETTINGS permission
 *     setVolume(value: Float)       — AudioManager, no special permission
 *     setWifi(enabled: Boolean)     — opens WiFi settings panel on Android 10+
 *     setBluetooth(enabled: Boolean)— BluetoothAdapter, requires BLUETOOTH_CONNECT
 *     setDnd(enabled: Boolean)      — NotificationManager, requires ACCESS_NOTIFICATION_POLICY
 *     setFlashlight(on: Boolean)    — CameraManager, no special permission
 *     setAirplaneMode(enabled: Boolean) — opens settings panel (can't toggle programmatically on Android 8+)
 *
 * Notes on Android API restrictions:
 *   - WiFi: WifiManager.setWifiEnabled() is deprecated/restricted on Android 10+.
 *     We open the WiFi panel instead (same as AOSP quick settings).
 *   - Bluetooth: requires BLUETOOTH_CONNECT on Android 12+.
 *     On Android 9 and below, startActivityForResult is used.
 *   - Airplane mode: cannot be toggled programmatically since Android 4.2.
 *     We open Settings.ACTION_AIRPLANE_MODE_SETTINGS.
 *   - Brightness: requires the user to grant WRITE_SETTINGS. We check first
 *     and open the permission screen if not granted.
 */
class WeftControlModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WeftControl"
    }

    override fun getName(): String = "WeftControl"

    // ─────────────────────────────────────────────────────────────────────────
    // BRIGHTNESS
    // ─────────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun getBrightness(promise: Promise) {
        try {
            val raw = Settings.System.getInt(
                reactContext.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
                128
            )
            val map = WritableNativeMap()
            map.putDouble("value", raw / 255.0)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "getBrightness failed: ${e.message}", e)
            val map = WritableNativeMap()
            map.putDouble("value", 0.5)
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun setBrightness(value: Float, promise: Promise) {
        // On Android 6+ WRITE_SETTINGS requires explicit user permission.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.System.canWrite(reactContext)
        ) {
            // Open the permission screen so user can grant it
            val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            try {
                reactContext.startActivity(intent)
            } catch (e: Exception) {
                Log.w(TAG, "Could not open WRITE_SETTINGS screen: ${e.message}")
            }
            val map = WritableNativeMap()
            map.putBoolean("permissionRequired", true)
            promise.resolve(map)
            return
        }

        try {
            // Disable auto-brightness first so the manual value sticks
            Settings.System.putInt(
                reactContext.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
            )
            val raw = (value.coerceIn(0f, 1f) * 255).toInt()
            Settings.System.putInt(
                reactContext.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
                raw
            )

            // Apply to the current window immediately
            val activity = reactContext.currentActivity
            activity?.runOnUiThread {
                try {
                    val lp = activity.window.attributes
                    lp.screenBrightness = value.coerceIn(0.01f, 1f)
                    activity.window.attributes = lp
                } catch (e: Exception) {
                    Log.w(TAG, "Window brightness apply failed: ${e.message}")
                }
            }

            val map = WritableNativeMap()
            map.putBoolean("success", true)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "setBrightness failed: ${e.message}", e)
            promise.resolve(WritableNativeMap())
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VOLUME
    // ─────────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun getVolume(promise: Promise) {
        try {
            val audio = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val current = audio.getStreamVolume(AudioManager.STREAM_MUSIC).toFloat()
            val max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC).toFloat()
            val map = WritableNativeMap()
            map.putDouble("value", if (max > 0) (current / max).toDouble() else 0.5)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "getVolume failed: ${e.message}", e)
            val map = WritableNativeMap()
            map.putDouble("value", 0.5)
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun setVolume(value: Float, promise: Promise) {
        try {
            val audio = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val raw = (value.coerceIn(0f, 1f) * max).toInt()
            audio.setStreamVolume(AudioManager.STREAM_MUSIC, raw, 0)
            val map = WritableNativeMap()
            map.putBoolean("success", true)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "setVolume failed: ${e.message}", e)
            promise.resolve(WritableNativeMap())
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WI-FI
    // ─────────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun getWifiEnabled(promise: Promise) {
        try {
            val wm = reactContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            val map = WritableNativeMap()
            map.putBoolean("value", wm.isWifiEnabled)
            promise.resolve(map)
        } catch (e: Exception) {
            val map = WritableNativeMap()
            map.putBoolean("value", false)
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun setWifi(enabled: Boolean, promise: Promise) {
        // Android 10+ (Q): apps cannot toggle WiFi directly. Open the panel.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                val intent = Intent(android.provider.Settings.ACTION_WIFI_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            } catch (e: Exception) {
                Log.w(TAG, "Could not open WiFi settings: ${e.message}")
            }
            val map = WritableNativeMap()
            map.putBoolean("openedSettings", true)
            promise.resolve(map)
            return
        }

        // Android 9 and below — direct toggle
        try {
            @Suppress("DEPRECATION")
            val wm = reactContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            wm.isWifiEnabled = enabled
            val map = WritableNativeMap()
            map.putBoolean("success", true)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "setWifi failed: ${e.message}", e)
            promise.resolve(WritableNativeMap())
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BLUETOOTH
    // ─────────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun getBluetoothEnabled(promise: Promise) {
        try {
            val bm = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter: BluetoothAdapter? = bm?.adapter
            val map = WritableNativeMap()
            map.putBoolean("value", adapter?.isEnabled == true)
            promise.resolve(map)
        } catch (e: Exception) {
            val map = WritableNativeMap()
            map.putBoolean("value", false)
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun setBluetooth(enabled: Boolean, promise: Promise) {
        // Android 13+ (TIRAMISU): cannot enable/disable BT programmatically.
        // Open settings panel instead.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            try {
                val intent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            } catch (e: Exception) {
                Log.w(TAG, "Could not open Bluetooth settings: ${e.message}")
            }
            val map = WritableNativeMap()
            map.putBoolean("openedSettings", true)
            promise.resolve(map)
            return
        }

        try {
            val bm = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter: BluetoothAdapter? = bm?.adapter
            if (adapter != null) {
                if (enabled) {
                    @Suppress("DEPRECATION")
                    adapter.enable()
                } else {
                    @Suppress("DEPRECATION")
                    adapter.disable()
                }
            }
            val map = WritableNativeMap()
            map.putBoolean("success", true)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "setBluetooth failed: ${e.message}", e)
            promise.resolve(WritableNativeMap())
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DO NOT DISTURB
    // ─────────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun getDndEnabled(promise: Promise) {
        try {
            val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager
            val map = WritableNativeMap()
            // INTERRUPTION_FILTER_NONE or INTERRUPTION_FILTER_PRIORITY = DND on
            val filter = nm.currentInterruptionFilter
            val isOn = filter == NotificationManager.INTERRUPTION_FILTER_NONE ||
                       filter == NotificationManager.INTERRUPTION_FILTER_PRIORITY ||
                       filter == NotificationManager.INTERRUPTION_FILTER_ALARMS
            map.putBoolean("value", isOn)
            promise.resolve(map)
        } catch (e: Exception) {
            val map = WritableNativeMap()
            map.putBoolean("value", false)
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun setDnd(enabled: Boolean, promise: Promise) {
        try {
            val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager

            if (!nm.isNotificationPolicyAccessGranted) {
                // Open the DND access settings page
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                try { reactContext.startActivity(intent) } catch (e: Exception) {
                    Log.w(TAG, "Could not open DND settings: ${e.message}")
                }
                val map = WritableNativeMap()
                map.putBoolean("permissionRequired", true)
                promise.resolve(map)
                return
            }

            val filter = if (enabled)
                NotificationManager.INTERRUPTION_FILTER_PRIORITY
            else
                NotificationManager.INTERRUPTION_FILTER_ALL

            nm.setInterruptionFilter(filter)
            val map = WritableNativeMap()
            map.putBoolean("success", true)
            promise.resolve(map)
        } catch (e: Exception) {
            Log.e(TAG, "setDnd failed: ${e.message}", e)
            promise.resolve(WritableNativeMap())
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLASHLIGHT
    // ─────────────────────────────────────────────────────────────────────────

    /** Tracks torch state since CameraManager has no getter for torch state. */
    private var torchOn = false

    @ReactMethod
    fun getFlashlightOn(promise: Promise) {
        val map = WritableNativeMap()
        map.putBoolean("value", torchOn)
        promise.resolve(map)
    }

    @ReactMethod
    fun setFlashlight(on: Boolean, promise: Promise) {
        try {
            val cm = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            // Use the first back-facing camera (index 0 on almost all devices)
            val cameraId = cm.cameraIdList.firstOrNull()
            if (cameraId == null) {
                promise.resolve(WritableNativeMap())
                return
            }
            cm.setTorchMode(cameraId, on)
            torchOn = on
            val map = WritableNativeMap()
            map.putBoolean("success", true)
            promise.resolve(map)
        } catch (e: CameraAccessException) {
            Log.w(TAG, "setFlashlight CameraAccessException: ${e.message}")
            torchOn = false
            promise.resolve(WritableNativeMap())
        } catch (e: Exception) {
            Log.e(TAG, "setFlashlight failed: ${e.message}", e)
            promise.resolve(WritableNativeMap())
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AIRPLANE MODE
    // ─────────────────────────────────────────────────────────────────────────

    @ReactMethod
    fun getAirplaneModeOn(promise: Promise) {
        try {
            val isOn = Settings.Global.getInt(
                reactContext.contentResolver,
                Settings.Global.AIRPLANE_MODE_ON,
                0
            ) != 0
            val map = WritableNativeMap()
            map.putBoolean("value", isOn)
            promise.resolve(map)
        } catch (e: Exception) {
            val map = WritableNativeMap()
            map.putBoolean("value", false)
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun setAirplaneMode(enabled: Boolean, promise: Promise) {
        // Cannot toggle airplane mode programmatically since Android 4.2.
        // Open the airplane mode settings page.
        try {
            val intent = Intent(Settings.ACTION_AIRPLANE_MODE_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            Log.w(TAG, "Could not open airplane mode settings: ${e.message}")
        }
        val map = WritableNativeMap()
        map.putBoolean("openedSettings", true)
        promise.resolve(map)
    }
}
