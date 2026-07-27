package com.weft

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * WeftControlPackage
 *
 * Registers WeftControlModule with React Native's package system.
 * Added to MainApplication's package list so the module is available
 * globally as NativeModules.WeftControl from JS.
 */
class WeftControlPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(WeftControlModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
