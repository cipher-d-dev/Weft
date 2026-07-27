package com.weft

import android.app.WallpaperManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.palette.graphics.Palette
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import java.io.InputStream

class WallpaperSetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WallpaperSet"
        // WallpaperManager flag constants (API 24+)
        private const val FLAG_SYSTEM = 1
        private const val FLAG_LOCK = 2
    }

    override fun getName(): String = "WallpaperSet"

    /**
     * Set the wallpaper from a base64-encoded JPEG/PNG string.
     * @param base64Data  Raw base64 string (no data URI prefix)
     * @param target      "home" | "lock" | "both"
     */
    @ReactMethod
    fun setWallpaperFromBase64(base64Data: String, target: String, promise: Promise) {
        try {
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode base64 image")
                return
            }
            applyWallpaper(bitmap, target, promise)
        } catch (e: Exception) {
            Log.e(TAG, "setWallpaperFromBase64 failed: ${e.message}", e)
            promise.reject("SET_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Set the wallpaper from a content:// or file:// URI (device gallery pick).
     * @param uriString   Content or file URI string
     * @param target      "home" | "lock" | "both"
     */
    @ReactMethod
    fun setWallpaperFromUri(uriString: String, target: String, promise: Promise) {
        try {
            val uri = Uri.parse(uriString)
            val inputStream: InputStream? = reactContext.contentResolver.openInputStream(uri)
            if (inputStream == null) {
                promise.reject("URI_ERROR", "Cannot open URI: $uriString")
                return
            }
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode image from URI")
                return
            }
            applyWallpaper(bitmap, target, promise)
        } catch (e: Exception) {
            Log.e(TAG, "setWallpaperFromUri failed: ${e.message}", e)
            promise.reject("SET_ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Extract the dominant color from a base64 image string.
     * Returns a WritableMap: { dominant: "#RRGGBB", vibrant: "#RRGGBB", muted: "#RRGGBB",
     *                          darkVibrant: "#RRGGBB", darkMuted: "#RRGGBB" }
     * Any swatch that isn't available will be null in the map.
     */
    @ReactMethod
    fun extractDominantColor(base64Data: String, promise: Promise) {
        try {
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            if (bitmap == null) {
                promise.reject("DECODE_ERROR", "Failed to decode base64 image")
                return
            }

            // Downsample to 200x200 for fast Palette extraction
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
            Log.e(TAG, "extractDominantColor failed: ${e.message}", e)
            promise.reject("PALETTE_ERROR", e.message ?: "Unknown error")
        }
    }

    // ── Private helpers ─────────────────────────────────────────────────

    private fun applyWallpaper(bitmap: Bitmap, target: String, promise: Promise) {
        try {
            val wm = WallpaperManager.getInstance(reactContext)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // API 24+: can target home, lock, or both independently
                val flags = when (target.lowercase()) {
                    "lock" -> FLAG_LOCK
                    "both" -> FLAG_SYSTEM or FLAG_LOCK
                    else   -> FLAG_SYSTEM   // "home" or default
                }
                wm.setBitmap(bitmap, null, true, flags)
            } else {
                // API 23 and below: single wallpaper only
                wm.setBitmap(bitmap)
            }

            // Invalidate the WallpaperModule read cache so the home screen
            // immediately shows the new wallpaper on next read
            val map = WritableNativeMap()
            map.putBoolean("success", true)
            map.putString("target", target)
            promise.resolve(map)
        } catch (e: SecurityException) {
            Log.w(TAG, "SET_WALLPAPER permission denied: ${e.message}")
            promise.reject("PERMISSION_ERROR", "SET_WALLPAPER permission required")
        } catch (e: Exception) {
            Log.e(TAG, "applyWallpaper failed: ${e.message}", e)
            promise.reject("SET_ERROR", e.message ?: "Unknown error")
        }
    }

    private fun Int.toHexColor(): String = String.format("#%06X", 0xFFFFFF and this)
}
