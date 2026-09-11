$ErrorActionPreference = "SilentlyContinue"
$root = "D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  He Wo Lian Ai Ba - Dev Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting backend (port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root\backend`" && npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 1

Write-Host "[2/2] Starting frontend (port 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root\frontend`" && npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Close Backend/Frontend cmd windows to stop." -ForegroundColor DarkGray
