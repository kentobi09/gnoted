npm run build
npx cap sync android
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" "SecureVault.apk" -Force
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" "G:\My Drive\my apks\SecureVault.apk" -Force
Write-Host "✅ Uploaded clean final APK to Repository (SecureVault.apk) and Google Drive (G:\My Drive\my apks\SecureVault.apk)!" -ForegroundColor Green
