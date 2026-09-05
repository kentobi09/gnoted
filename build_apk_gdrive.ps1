Write-Host "📦 Building Web Assets & Android Package for GNOTED..." -ForegroundColor Cyan
npm run build
npx cap sync android

Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..

$targetDir = "G:\My Drive\my apks"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" "GNOTED.apk" -Force
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" "$targetDir\GNOTED.apk" -Force

Write-Host "🎉 Successfully built and copied GNOTED.apk to Google Drive ($targetDir\GNOTED.apk)!" -ForegroundColor Green
