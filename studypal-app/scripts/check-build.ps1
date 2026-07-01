# StudyPal — Check EAS Build Status
# Run from studypal-app/:   .\scripts\check-build.ps1

Write-Host "`n📱 Checking EAS build status...`n" -ForegroundColor Cyan

npx eas build:list --platform android --limit 1

Write-Host "`n🔗 Build details page:" -ForegroundColor Yellow
Write-Host "   https://expo.dev/accounts/kiprotichlevy/projects/studypal-app/builds/6815f51f-527d-464a-aee6-547d3a70eeb0`n"

Write-Host "⏳ When Status shows 'finished':" -ForegroundColor Green
Write-Host "   1. Download the APK from the build page above"
Write-Host "   2. Rename it: studypal-v1.0.0.apk"
Write-Host "   3. Copy to:   C:\Users\Studyroom\Desktop\studypal\public\download\"
Write-Host "   4. Update app\page.tsx → APK_URL = '/download/studypal-v1.0.0.apk'"
Write-Host "   5. Update app\api\app\version\route.ts → downloadUrl to the same path"
Write-Host "   6. Deploy the web: git push`n"
