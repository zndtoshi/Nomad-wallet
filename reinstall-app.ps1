# NomadWallet Reinstall Script
# This script completely uninstalls and reinstalls the app

Write-Host "=== NomadWallet Reinstall Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check device connection
Write-Host "[1/5] Checking device connection..." -ForegroundColor Yellow
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

# Step 2: Uninstall the app
Write-Host "[2/5] Uninstalling NomadWallet..." -ForegroundColor Yellow
adb uninstall com.nomadwallet
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] App uninstalled" -ForegroundColor Green
} else {
    Write-Host "[WARN] App may not have been installed (this is OK)" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Clear any cached data (optional but recommended)
Write-Host "[3/5] Clearing app data cache..." -ForegroundColor Yellow
adb shell pm clear com.nomadwallet 2>$null
Write-Host "[OK] Cache cleared" -ForegroundColor Green
Write-Host ""

# Step 4: Verify APK exists
Write-Host "[4/5] Checking APK file..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "[OK] APK found: $apkPath ($([math]::Round($apkSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "ERROR: APK not found at $apkPath" -ForegroundColor Red
    Write-Host "Please build the APK first: cd android; .\gradlew.bat assembleDebug" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Install the APK
Write-Host "[5/5] Installing new APK..." -ForegroundColor Yellow
adb install -r $apkPath
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] App installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Installation Complete ===" -ForegroundColor Cyan
    Write-Host "The app should now show 'v.003' in the top-right corner" -ForegroundColor Cyan
    Write-Host "Launch the app to verify!" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: Installation failed!" -ForegroundColor Red
    Write-Host "Check the error message above" -ForegroundColor Red
    exit 1
}
