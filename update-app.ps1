# NomadWallet Update Script
# This script rebuilds and reinstalls the app with the latest changes

Write-Host "=== NomadWallet Update Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check device connection
Write-Host "[1/6] Checking device connection..." -ForegroundColor Yellow
$devices = adb devices
$hasDevice = $false
foreach ($line in $devices) {
    if ($line -match "\s+device\s*$") {
        $hasDevice = $true
        break
    }
}
if (-not $hasDevice) {
    Write-Host "ERROR: No device connected!" -ForegroundColor Red
    Write-Host "Please connect your device or start an emulator" -ForegroundColor Red
    Write-Host "Current devices:" -ForegroundColor Yellow
    Write-Host $devices
    exit 1
}
Write-Host "[OK] Device connected" -ForegroundColor Green
Write-Host ""

# Step 2: Regenerate JavaScript bundle
Write-Host "[2/6] Regenerating JavaScript bundle..." -ForegroundColor Yellow
$bundleOutput = "android\app\src\main\assets\index.android.bundle"
$assetsDir = "android\app\src\main\res"

# Ensure assets directory exists
$assetsPath = Split-Path $bundleOutput -Parent
if (-not (Test-Path $assetsPath)) {
    New-Item -ItemType Directory -Path $assetsPath -Force | Out-Null
}

npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output $bundleOutput --assets-dest $assetsDir
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Bundle generation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Bundle regenerated" -ForegroundColor Green
Write-Host ""

# Step 3: Build APK
Write-Host "[3/6] Building APK..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat assembleDebug
$buildResult = $LASTEXITCODE
Pop-Location
if ($buildResult -ne 0) {
    Write-Host "ERROR: APK build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] APK built successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Verify APK exists
Write-Host "[4/6] Verifying APK..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Write-Host "ERROR: APK not found at $apkPath" -ForegroundColor Red
    exit 1
}
$apkSize = (Get-Item $apkPath).Length / 1MB
Write-Host "[OK] APK found: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
Write-Host ""

# Step 5: Uninstall old app
Write-Host "[5/6] Uninstalling old app..." -ForegroundColor Yellow
adb uninstall com.nomadwallet | Out-Null
Write-Host "[OK] Old app uninstalled" -ForegroundColor Green
Write-Host ""

# Step 6: Install new APK
Write-Host "[6/6] Installing new APK..." -ForegroundColor Yellow
adb install -r $apkPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Installation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] App installed successfully!" -ForegroundColor Green
Write-Host ""

# Launch the app
Write-Host "Launching app..." -ForegroundColor Yellow
adb shell am start -n com.nomadwallet/.MainActivity | Out-Null
Write-Host ""

Write-Host "=== Update Complete ===" -ForegroundColor Cyan
Write-Host "The app has been updated and launched!" -ForegroundColor Cyan
Write-Host "Check the top-right corner for the version number." -ForegroundColor Cyan

