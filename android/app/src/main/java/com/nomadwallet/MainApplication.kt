package com.nomadwallet

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.nomadwallet.NostrNativePackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          // Use autolinking to get all packages
          val packages = PackageList(this).packages.toMutableList()
          // Add our custom Nostr native module package
          packages.add(NostrNativePackage())
          return packages
        }

        override fun getJSMainModuleName(): String = "index"

        // Force standalone mode: Always load from bundled assets, never from Metro
        override fun getUseDeveloperSupport(): Boolean = false
        
        override fun getBundleAssetName(): String = "index.android.bundle"

        override val isNewArchEnabled: Boolean = false
        override val isHermesEnabled: Boolean = true
      }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
  }
}
