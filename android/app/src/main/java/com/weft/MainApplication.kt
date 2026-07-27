package com.weft

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList =
                PackageList(this).packages.apply {
                    // Weft native modules:
                    // WallpaperModule — reads system wallpaper as base64 for JS rendering
                    add(WallpaperPackage())
                    // WeftSystemUIModule — controls nav bar color and icon tints from JS
                    add(WeftSystemUIPackage())
                    // SetDefaultLauncherModule — prompts user to set Weft as default home
                    add(SetDefaultLauncherPackage())
                    // WeftControlModule — brightness, volume, wifi, bt, DND, flashlight, airplane
                    add(WeftControlPackage())
                    // WallpaperSetModule — sets system wallpaper + extracts dominant color
                    add(WallpaperSetPackage())
                    // IconPackModule — discovers icon packs and loads icons from them
                    add(IconPackPackage())
                    // NotificationBadgeModule — reads active notification counts for badge display
                    add(NotificationBadgePackage())
                    // SystemGesturesModule — expands notifications/quick settings, shows recent apps
                    add(SystemGesturesPackage())
                },
        )
    }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
    }
}
