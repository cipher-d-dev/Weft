package com.weft

import android.app.WallpaperManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
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
 * Reading strategy:
 *   Android 8.1+ (API 27+): WallpaperManager.getWallpaperFile(FLAG_SYSTEM)
 *     Returns a ParcelFileDescriptor for the wallpaper file directly.
 *     Works for all third-party launchers without READ_WALLPAPER_INTERNAL,
 *     which is a signature-level permission only available to system apps.
 *   Fallback: WallpaperManager.getDrawable()
 *     Used on API < 27. May return null on some devices/emulators.
 *
 * The module caches the result in memory so subsequent calls are free.
 * Call invalidateCache() to force a fresh read (e.g. after the user changes
 * their wallpaper and returns to the launcher).
 */
class WallpaperModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "WallpaperModule"
        private const val JPEG_QUALITY = 85
        private const val MAX_DIMENSION = 1440
    }

    /** In-memory cache — null means not yet fetched or invalidated. */
    private var cachedDataUri: String? = null

    override fun getName(): String = "WallpaperModule"

    /**
     * Returns the current home wallpaper as a data URI string:
     *   "data:image/jpeg;base64,/9j/4AAQSkZJRgAB..."
     *
     * Resolves with null if the wallpaper cannot be read (emulator with no
     * wallpaper set, permission denied, API too old).
     */
    @ReactMethod
    fun getWallpaperBase64(promise: Promise) {
        cachedDataUri?.let {
            promise.resolve(it)
            return
        }

        try {
            val bitmap = readWallpaperBitmap()
            if (bitmap == null) {
                Log.w(TAG, "Could not read wallpaper — resolving null")
                promise.resolve(null)
                return
            }
            val downsampled = downsampleIfNeeded(bitmap)
            val dataUri = bitmapToDataUri(downsampled)
            cachedDataUri = dataUri
            promise.resolve(dataUri)
        } catch (e: SecurityException) {
            Log.w(TAG, "Permission denied reading wallpaper: ${e.message}")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read wallpaper: ${e.message}", e)
            promise.resolve(null)
        }
    }

    /**
     * Clears the in-memory cache so the next getWallpaperBase64() call reads
     * a fresh wallpaper. Call this from JS when AppState changes to 'active'.
     */
    @ReactMethod
    fun invalidateCache(promise: Promise) {
        cachedDataUri = null
        promise.resolve(null)
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Attempts to decode the wallpaper bitmap using the best available API.
     *
     * API 27+: getWallpaperFile() — works for third-party apps, no
     *   READ_WALLPAPER_INTERNAL required. Returns a ParcelFileDescriptor
     *   whose file descriptor we decode directly.
     *
     * API < 27 fallback: getDrawable() — older devices only.
     */
    private fun readWallpaperBitmap(): Bitmap? {
        val wm = WallpaperManager.getInstance(reactContext)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // getWallpaperFile is available from API 27 (Android 8.1)
            val pfd = wm.getWallpaperFile(WallpaperManager.FLAG_SYSTEM)
            if (pfd != null) {
                pfd.use { parcel ->
                    return BitmapFactory.decodeFileDescriptor(parcel.fileDescriptor)
                }
            }
            // pfd null means no wallpaper file exists (e.g. live wallpaper or emulator)
            Log.w(TAG, "getWallpaperFile returned null — live wallpaper or no file")
            return null
        }

        // Legacy path for API < 27
        val drawable: Drawable? = wm.drawable
        return if (drawable != null) drawableToBitmap(drawable) else null
    }

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return drawable.bitmap
        }
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 1080
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 1920
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }

    private fun downsampleIfNeeded(src: Bitmap): Bitmap {
        if (src.width <= MAX_DIMENSION && src.height <= MAX_DIMENSION) return src
        val scale = MAX_DIMENSION.toFloat() / maxOf(src.width, src.height)
        val newW = (src.width * scale).toInt()
        val newH = (src.height * scale).toInt()
        return Bitmap.createScaledBitmap(src, newW, newH, true)
    }

    private fun bitmapToDataUri(bitmap: Bitmap): String {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
        val b64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
        return "data:image/jpeg;base64,$b64"
    }
}
