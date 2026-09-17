$ErrorActionPreference = "Stop"
# YH-147 启动脚本相对路径+显式报错+健康等待：禁硬编码绝对路径换机器即挂
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($root)) {
  throw '启动失败：无法解析项目根目录，请用绝对路径调用start.ps1'
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  He Wo Lian Ai Ba - Dev Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting backend (port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root\backend`" && npm run dev" -WindowStyle Minimized

# YH-147 健康等待：后端readyz通后再起前端，禁吞错
$backendJianKang = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  try {
    $xiangYing = Invoke-WebRequest -Uri 'http://localhost:3000/readyz' -TimeoutSec 3 -UseBasicParsing
    if ($xiangYing.StatusCode -eq 200) { $backendJianKang = $true; break }
  } catch { }
}
if (-not $backendJianKang) { throw '启动失败：后端30轮健康等待未通过，请检查后端日志' }

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
