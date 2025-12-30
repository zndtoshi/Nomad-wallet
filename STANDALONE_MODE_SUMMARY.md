# NomadWallet Standalone Mode Configuration - Summary

## ✅ Status: CONFIGURED AND VERIFIED

NomadWallet is now configured to run in standalone/production mode without requiring the Metro bundler!

---

## 🎯 What Was Changed

### File: `android/app/build.gradle`

**Added to the `react` block:**

```gradle
react {
    /* Folders */
    root = file("../../")
    reactNativeDir = file("../../node_modules/react-native")
    codegenDir = file("../../node_modules/@react-native/codegen")
    
    /* Standalone mode - Bundle JS in debug APK (no Metro required) */
    // By default, 'debug' variant is not bundled. Remove it to force bundling.
    debuggableVariants = []
}
```

---

## 📝 Explanation

### What is `debuggableVariants`?

In React Native 0.74+, the new Gradle plugin uses `debuggableVariants` to specify which build variants should:
- **NOT** bundle JavaScript (expects Metro bundler)
- Have Hermes debug flags enabled
- Run in development mode

**Default value:** `['debug']`

By setting `debuggableVariants = []`, we tell Gradle to:
- ✅ Bundle JavaScript for ALL variants (including debug)
- ✅ Package the bundle into the APK
- ✅ Run without Metro bundler

---

## 🔧 Build Process

### Step 1: Generate JavaScript Bundle
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
```

**Output:**
```
Welcome to Metro v0.80.12
info Writing bundle output to: android/app/src/main/assets/index.android.bundle
info Done writing bundle output
info Copying 6 asset files
info Done copying assets
```

### Step 2: Build APK
```bash
cd android
./gradlew assembleDebug
```

**Result:**
```
BUILD SUCCESSFUL in 5s
199 actionable tasks: 12 executed, 187 up-to-date
```

---

## ✅ Verification

### Bundle in APK
```
✅ SUCCESS! Bundle is in APK
Bundle size: 1261.6 KB
Location: assets/index.android.bundle
```

### APK Details
- **Location:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Size:** ~126.6 MB
- **Contains:** Bundled JavaScript (1.26 MB)
- **Mode:** Standalone (no Metro required)

---

## 🚀 How to Use

### Option 1: Install and Run (No Metro)

```bash
# Install the APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Launch the app
adb shell am start -n com.nomadwallet/.MainActivity
```

**The app will run immediately without needing Metro bundler!**

### Option 2: Rebuild When Code Changes

Whenever you modify JavaScript code:

```bash
# 1. Generate new bundle
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# 2. Rebuild APK
cd android && ./gradlew assembleDebug

# 3. Install
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 📊 Comparison: Metro vs Standalone

| Feature | With Metro Bundler | Standalone Mode |
|---------|-------------------|-----------------|
| **Metro Required** | ✅ Yes | ❌ No |
| **Fast Refresh** | ✅ Yes | ❌ No |
| **Instant Updates** | ✅ Yes | ❌ No |
| **Build Time** | Fast (no bundling) | Slower (includes bundling) |
| **APK Size** | Smaller | Larger (+1.3 MB) |
| **Offline Testing** | ❌ No | ✅ Yes |
| **Production-like** | ❌ No | ✅ Yes |
| **Network Required** | ✅ Yes (dev machine) | ❌ No |

---

## 🎯 When to Use Each Mode

### Use Metro Bundler (Default) When:
- 🔧 Actively developing
- 🔄 Need Fast Refresh
- 💻 Dev machine is available
- ⚡ Want instant code updates

### Use Standalone Mode When:
- 📱 Testing on physical devices without dev machine
- 🌐 Testing offline functionality
- 🚀 Preparing for production
- 📦 Sharing APK with testers
- 🔒 Testing in production-like environment

---

## 🔄 Switching Between Modes

### Enable Metro Mode (Development)
```gradle
react {
    debuggableVariants = ['debug']  // Default
}
```

### Enable Standalone Mode (Production-like)
```gradle
react {
    debuggableVariants = []  // Force bundling
}
```

Then rebuild:
```bash
cd android && ./gradlew clean assembleDebug
```

---

## 📝 Alternative: Automated Script

Create `bundle-and-build.sh` (or `.bat` for Windows):

```bash
#!/bin/bash
echo "🔨 Generating JavaScript bundle..."
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

echo "📦 Building APK..."
cd android
./gradlew assembleDebug

echo "✅ Done! APK at: android/app/build/outputs/apk/debug/app-debug.apk"
```

Make executable:
```bash
chmod +x bundle-and-build.sh
```

Run:
```bash
./bundle-and-build.sh
```

---

## 🐛 Troubleshooting

### Issue: "Unable to load script from assets"

**Cause:** Bundle not generated or not in APK

**Solution:**
1. Manually generate bundle:
   ```bash
   npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
   ```
2. Rebuild APK
3. Verify bundle is in APK (see verification steps above)

### Issue: App shows red screen "Could not connect to development server"

**Cause:** App is trying to connect to Metro

**Solution:**
- Ensure `debuggableVariants = []` in build.gradle
- Clean and rebuild: `cd android && ./gradlew clean assembleDebug`

### Issue: Changes not reflected in app

**Cause:** Using old bundle

**Solution:**
1. Delete old bundle: `rm android/app/src/main/assets/index.android.bundle`
2. Generate new bundle
3. Rebuild APK

---

## 🎉 Benefits of Standalone Mode

1. **✅ No Metro Required** - App runs independently
2. **✅ Offline Testing** - Test without network connection
3. **✅ Production-like** - Closer to release build behavior
4. **✅ Easy Sharing** - Just share the APK file
5. **✅ Faster Startup** - No Metro connection delay
6. **✅ Consistent** - Same behavior every time

---

## 📚 Additional Notes

### Bundle Contents
The `index.android.bundle` file contains:
- All JavaScript code (minified)
- React Native framework
- All npm dependencies
- App logic and components

### Asset Files
Assets are copied to:
- `android/app/src/main/res/` - Images, fonts, etc.
- Automatically included in APK

### Hermes Bytecode
If Hermes is enabled (default in RN 0.74+):
- Bundle is compiled to Hermes bytecode
- Faster startup time
- Smaller bundle size
- Better performance

---

## ✨ Summary

**Configuration:** `debuggableVariants = []` in `android/app/build.gradle`

**Result:** Debug APK now includes bundled JavaScript and runs standalone without Metro bundler!

**Bundle Size:** 1.26 MB  
**APK Size:** 126.6 MB  
**Build Status:** ✅ Successful  
**Standalone Mode:** ✅ Enabled

---

**The app is now ready for production-like testing!** 🚀

