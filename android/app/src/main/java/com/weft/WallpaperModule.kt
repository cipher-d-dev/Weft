package com.weft

import android.app.WallpaperManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream

/**
 * WallpaperModule
 *
 * Exposes the device's current home screen wallpaper to React Native as a
 * base64-encoded JPEG string. React Native can then render it as an
 * ImageBackground underneath all launcher content, making Weft look like it
 * genuinely draws on top of the wallpaper rather than showing a fake background.
 *
 * Usage from JS:
 *   import { NativeModules } from 'react-native';
 *   const { WallpaperModule } = NativeModules;
 *   const base64 = await WallpaperModule.getWallpaperBase64();
 *   // → "data:image/jpeg;base64,/9j/4AAQSkZJRgAB..."
 *
 * The module caches the result in memory so subsequent calls are free.
 * Call invalidateCache() to force a fresh read (e.g. after the user changes
 * their wallpaper and returns to the launcher).
 */
class WallpaperModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WallpaperModule"
        private const val JPEG_QUALITY = 85   // Good enough for a background
        private const val MAX_DIMENSION = 1440 // Downsample very large wallpapers
    }

    /** In-memory cache — null means not yet fetched or invalidated. */
    private var cachedDataUri: String? = null

    override fun getName(): String = "WallpaperModule"

    /**
     * Returns the current home wallpaper as a data URI string:
     *   "data:image/jpeg;base64,<base64-encoded JPEG>"
     *
     * Resolves with null if the wallpaper cannot be read (e.g. permission
     * denied, WallpaperManager unavailable on this device/emulator).
     */
    @ReactMethod
    fun getWallpaperBase64(promise: Promise) {
        // Return cached value immediately if available
        cachedDataUri?.let {
            promise.resolve(it)
            return
        }

        try {
            val wm = WallpaperManager.getInstance(reactContext)
            val drawable: Drawable? = wm.drawable

            if (drawable == null) {
                Log.w(TAG, "WallpaperManager.drawable returned null — emulator or permission issue")
                promise.resolve(null)
                return
            }

            val bitmap = drawableToBitmap(drawable)
            val downsampled = downsampleIfNeeded(bitmap)
            val dataUri = bitmapToDataUri(downsampled)

            cachedDataUri = dataUri
            promise.resolve(dataUri)

        } catch (e: SecurityException) {
            // READ_EXTERNAL_STORAGE not granted — resolve null, JS shows fallback
            Log.w(TAG, "Permission denied reading wallpaper: ${e.message}")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read wallpaper: ${e.message}", e)
            promise.resolve(null)   // Resolve null rather than reject — JS handles gracefully
        }
    }

    /**
     * Clears the in-memory cache so the next getWallpaperBase64() call reads
     * a fresh wallpaper. Call this from JS when AppState changes to 'active'
     * (user returns to launcher after potentially changing their wallpaper).
     */
    @ReactMethod
    fun invalidateCache(promise: Promise) {
        cachedDataUri = null
        promise.resolve(null)
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return drawable.bitmap
        }

        // Generic drawable — render to a canvas
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 1080
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 1920
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }

    private fun downsampleIfNeeded(src: Bitmap): Bitmap {
        val maxDim = MAX_DIMENSION
        if (src.width <= maxDim && src.height <= maxDim) return src

        val scale = maxDim.toFloat() / maxOf(src.width, src.height)
        val newW = (src.width * scale).toInt()
        val newH = (src.height * scale).toInt()
        return Bitmap.createScaledBitmap(src, newW, newH, true)
    }

    private fun bitmapToDataUri(bitmap: Bitmap): String {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
        val bytes = stream.toByteArray()
        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        return "data:image/jpeg;base64,$b64"
    }
}
