# View React Native Console Logs
# This script shows filtered console logs from the NomadWallet app

Write-Host "=== NomadWallet Console Logs ===" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Filter for React Native logs (ReactNativeJS tag) and our custom log tags
# This shows logs from JavaScript console.log, console.error, etc.
adb logcat -s ReactNativeJS:* NostrClient:* SetupScreen:* HomeScreen:* NomadServer:* App:*

