package com.weft

import android.app.Activity
import android.app.WallpaperManager
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.palette.graphics.Palette
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import java.io.InputStream

class WallpaperSetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WallpaperSet"
        private const val FLAG_SYSTEM = 1
        private const val FLAG_LOCK = 2
        private const val REQUEST_PICK_IMAGE = 7421
    }

    private var pickPromise: Promise? = null

    private val activityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {
            // Compiler tells us the correct 4-arg signature includes Activity
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?,
            ) {
                if (requestCode != REQUEST_PICK_IMAGE) return
                val p = pickPromise ?: return
                pickPromise = null
                if (resultCode == Activity.RESULT_OK) {
                    val uri = data?.data
                    if (uri != null) {
                        p.resolve(uri.toString())
                    } else {
                        p.reject("NO_URI", "No image URI returned")
                    }
                } else {
                    p.reject("CANCELLED", "User cancelled image picker")
                }
            }
        }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "WallpaperSet"

    /** Open the system image gallery picker and resolve with the selected URI. */
    @ReactMethod
    fun pickFromGallery(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No active Activity")
            return
        }
        if (pickPromise != null) {
            promise.reject("BUSY", "A gallery pick is already in progress")
            return
        }
        pickPromise = promise
        val intent = Intent(Intent.ACTION_PICK).apply { type = "image/*" }
        activity.startActivityForResult(intent, REQUEST_PICK_IMAGE)
    }

    /** Set wallpaper from a raw base64 string (no data-URI prefix). */
    @ReactMethod
    fun setWallpaperFromBase64(base64Data: String, target: String, promise: Promise) {
        try {
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                ?: return promise.reject("DECODE_ERROR", "Failed to decode base64 image")
            applyWallpaper(bitmap, target, promise)
        } catch (e: Exception) {
            Log.e(TAG, "setWallpaperFromBase64 failed", e)
            promise.reject("SET_ERROR", e.message ?: "Unknown error")
        }
    }

    /** Set wallpaper from a content:// or file:// URI. */
    @ReactMethod
    fun setWallpaperFromUri(uriString: String, target: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val stream: InputStream = reactApplicationContext.contentResolver.openInputStream(uri)
                ?: return promise.reject("URI_ERROR", "Cannot open URI: $uriString")
            val bitmap = BitmapFactory.decodeStream(stream).also { stream.close() }
                ?: return promise.reject("DECODE_ERROR", "Failed to decode image from URI")
            applyWallpaper(bitmap, target, promise)
        } catch (e: Exception) {
            Log.e(TAG, "setWallpaperFromUri failed", e)
            promise.reject("SET_ERROR", e.message ?: "Unknown error")
        }
    }

    /** Extract dominant palette colors from a base64 image. */
    @ReactMethod
    fun extractDominantColor(base64Data: String, promise: Promise) {
        try {
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                ?: return promise.reject("DECODE_ERROR", "Failed to decode base64 image")
            val thumb = Bitmap.createScaledBitmap(bitmap, 200, 200, true)
            Palette.from(thumb).generate { palette ->
                val map = WritableNativeMap()
                map.putString("dominant",    palette?.dominantSwatch?.rgb?.toHexColor())
                map.putString("vibrant",     palette?.vibrantSwatch?.rgb?.toHexColor())
                map.putString("muted",       palette?.mutedSwatch?.rgb?.toHexColor())
                map.putString("darkVibrant", palette?.darkVibrantSwatch?.rgb?.toHexColor())
                map.putString("darkMuted",   palette?.darkMutedSwatch?.rgb?.toHexColor())
                promise.resolve(map)
            }
        } catch (e: Exception) {
            Log.e(TAG, "extractDominantColor failed", e)
            promise.reject("PALETTE_ERROR", e.message ?: "Unknown error")
        }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private fun applyWallpaper(bitmap: Bitmap, target: String, promise: Promise) {
        try {
            val wm = WallpaperManager.getInstance(reactApplicationContext)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val flags = when (target.lowercase()) {
                    "lock" -> FLAG_LOCK
                    "both" -> FLAG_SYSTEM or FLAG_LOCK
                    else   -> FLAG_SYSTEM
                }
                wm.setBitmap(bitmap, null, true, flags)
            } else {
                wm.setBitmap(bitmap)
            }
            val map = WritableNativeMap()
            map.putBoolean("success", true)
            map.putString("target", target)
            promise.resolve(map)
        } catch (e: SecurityException) {
            Log.w(TAG, "SET_WALLPAPER permission denied: ${e.message}")
            promise.reject("PERMISSION_ERROR", "SET_WALLPAPER permission required")
        } catch (e: Exception) {
            Log.e(TAG, "applyWallpaper failed", e)
            promise.reject("SET_ERROR", e.message ?: "Unknown error")
        }
    }

    private fun Int.toHexColor(): String = String.format("#%06X", 0xFFFFFF and this)
}
