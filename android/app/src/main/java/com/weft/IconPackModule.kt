package com.weft

import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
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
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.io.ByteArrayOutputStream

class IconPackModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "IconPack"
        private const val PNG_QUALITY = 90
        private const val ICON_SIZE = 108
    }

    override fun getName(): String = "IconPack"

    @ReactMethod
    fun getInstalledIconPacks(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val packs = mutableListOf<ResolveInfo>()
            val adwIntent = Intent("org.adw.launcher.THEMES")
            packs += pm.queryIntentActivities(adwIntent, PackageManager.GET_META_DATA)
            val novaIntent = Intent(Intent.ACTION_MAIN).apply { addCategory("com.novalauncher.THEME") }
            packs += pm.queryIntentActivities(novaIntent, PackageManager.GET_META_DATA)
            val seen = mutableSetOf<String>()
            val result: WritableArray = WritableNativeArray()
            for (info in packs) {
                val pkgName = info.activityInfo.packageName
                if (seen.contains(pkgName)) continue
                seen.add(pkgName)
                try {
                    val appInfo = pm.getApplicationInfo(pkgName, 0)
                    val label = pm.getApplicationLabel(appInfo).toString()
                    val iconDrawable = pm.getApplicationIcon(pkgName)
                    val iconBase64 = drawableToBase64(iconDrawable)
                    val map = WritableNativeMap()
                    map.putString("packageName", pkgName)
                    map.putString("label", label)
                    map.putString("icon", iconBase64 ?: "")
                    result.pushMap(map)
                } catch (e: Exception) {
                    Log.w(TAG, "Skipping pack $pkgName: ${e.message}")
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "getInstalledIconPacks failed: ${e.message}", e)
            promise.resolve(WritableNativeArray())
        }
    }

    @ReactMethod
    fun getIconFromPack(appPackageName: String, packPackageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val packRes = pm.getResourcesForApplication(packPackageName)
            val flat = appPackageName.replace(".", "_")
            val lastSegment = appPackageName.substringAfterLast(".")
            val candidates = listOf(flat, lastSegment, "${flat}_icon", "icon_${flat}")
            for (name in candidates) {
                val resId = packRes.getIdentifier(name, "drawable", packPackageName)
                if (resId != 0) {
                    val drawable = packRes.getDrawable(resId, null)
                    val base64 = drawableToBase64(drawable)
                    val map = WritableNativeMap()
                    map.putString("icon", base64)
                    promise.resolve(map)
                    return
                }
            }
            val map = WritableNativeMap()
            map.putNull("icon")
            promise.resolve(map)
        } catch (e: Exception) {
            Log.w(TAG, "getIconFromPack failed: ${e.message}")
            val map = WritableNativeMap()
            map.putNull("icon")
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun getPackPreviewIcons(packPackageName: String, promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val packRes = pm.getResourcesForApplication(packPackageName)
            val fields = try {
                val clazz = Class.forName("$packPackageName.R\$drawable")
                clazz.fields.take(6)
            } catch (e: Exception) { emptyList() }
            val result: WritableArray = WritableNativeArray()
            for (field in fields) {
                try {
                    val resId = field.getInt(null)
                    val drawable = packRes.getDrawable(resId, null)
                    val base64 = drawableToBase64(drawable)
                    if (base64 != null) result.pushString(base64)
                } catch (e: Exception) { /* skip */ }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.resolve(WritableNativeArray())
        }
    }

    private fun drawableToBase64(drawable: Drawable?): String? {
        if (drawable == null) return null
        return try {
            val bitmap = drawableToBitmap(drawable)
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, PNG_QUALITY, stream)
            Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
        } catch (e: Exception) { null }
    }

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return Bitmap.createScaledBitmap(drawable.bitmap, ICON_SIZE, ICON_SIZE, true)
        }
        val bitmap = Bitmap.createBitmap(ICON_SIZE, ICON_SIZE, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, ICON_SIZE, ICON_SIZE)
        drawable.draw(canvas)
        return bitmap
    }
}
