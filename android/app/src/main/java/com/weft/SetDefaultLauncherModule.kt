package com.weft

import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SetDefaultLauncherModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SetDefaultLauncher"
        private const val REQUEST_CODE_ROLE = 1001
    }

    override fun getName(): String = "SetDefaultLauncher"

    @ReactMethod
    fun isDefaultLauncher(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = reactApplicationContext
                    .getSystemService(RoleManager::class.java)
                promise.resolve(roleManager?.isRoleHeld(RoleManager.ROLE_HOME) == true)
            } else {
                val intent = Intent(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                }
                val resolveInfo = reactApplicationContext.packageManager
                    .resolveActivity(intent, 0)
                val currentDefault = resolveInfo?.activityInfo?.packageName
                promise.resolve(currentDefault == reactApplicationContext.packageName)
            }
        } catch (e: Exception) {
            Log.e(TAG, "isDefaultLauncher failed: ${e.message}", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestDefaultLauncher(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = activity.getSystemService(RoleManager::class.java)
                if (roleManager != null && !roleManager.isRoleHeld(RoleManager.ROLE_HOME)) {
                    val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_HOME)
                    activity.startActivityForResult(intent, REQUEST_CODE_ROLE)
                }
                promise.resolve(null)
            } else {
                // Android 9 and below — open home settings
                val intent = Intent(android.provider.Settings.ACTION_HOME_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "requestDefaultLauncher failed: ${e.message}", e)
            promise.resolve(null)
        }
    }
}
