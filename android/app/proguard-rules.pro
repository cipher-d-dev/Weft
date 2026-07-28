# Weft — ProGuard / R8 rules for release build
# ─────────────────────────────────────────────────────────────────────────────

# ── React Native core ────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.**

# ── Weft native modules ──────────────────────────────────────────────────────
-keep class com.weft.WallpaperModule { *; }
-keep class com.weft.WallpaperPackage { *; }
-keep class com.weft.WallpaperSetModule { *; }
-keep class com.weft.WallpaperSetPackage { *; }
-keep class com.weft.WeftSystemUIModule { *; }
-keep class com.weft.WeftSystemUIPackage { *; }
-keep class com.weft.SetDefaultLauncherModule { *; }
-keep class com.weft.SetDefaultLauncherPackage { *; }
-keep class com.weft.WeftControlModule { *; }
-keep class com.weft.WeftControlPackage { *; }
-keep class com.weft.IconPackModule { *; }
-keep class com.weft.IconPackPackage { *; }
-keep class com.weft.NotificationBadgeModule { *; }
-keep class com.weft.NotificationBadgePackage { *; }
-keep class com.weft.SystemGesturesModule { *; }
-keep class com.weft.SystemGesturesPackage { *; }
-keep class com.weft.MainActivity { *; }
-keep class com.weft.MainApplication { *; }

# ── AsyncStorage ─────────────────────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-dontwarn com.reactnativecommunity.asyncstorage.**

# ── BlurView ─────────────────────────────────────────────────────────────────
-keep class com.cmcewen.blurview.** { *; }
-dontwarn com.cmcewen.blurview.**

# ── Launcher Kit ─────────────────────────────────────────────────────────────
-keep class com.launcherkit.** { *; }
-dontwarn com.launcherkit.**

# ── Safe Area Context ────────────────────────────────────────────────────────
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.th3rdwave.safeareacontext.**

# ── Keep reflection targets (StatusBarManager, ActivityManager) ──────────────
-keepclassmembers class android.app.StatusBarManager {
    public void expandNotificationsPanel();
    public void expandSettingsPanel();
}
-keepclassmembers class android.app.ActivityManager {
    public java.util.List getRecentTasks(int, int);
}

# ── General Android keep rules ───────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ── Suppress common warnings ─────────────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn javax.annotation.**
-dontwarn sun.misc.Unsafe
