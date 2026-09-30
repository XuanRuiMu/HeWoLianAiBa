$ErrorActionPreference = "Stop"
# 背景实验室A版小样一键启动：仿照 start.ps1，禁硬编码绝对路径换机器即挂
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($root)) {
  throw '启动失败：无法解析背景实验室目录，请用绝对路径调用start-lab-a.ps1'
}

$labDir = Join-Path $root 'lab-a-base'
$entry = Join-Path $labDir 'lab-a.html'
if (-not (Test-Path -LiteralPath $entry)) {
  throw "启动失败：找不到A版入口 $entry"
}
if (-not (Test-Path -LiteralPath (Join-Path $labDir 'wu-2d.png'))) {
  throw "启动失败：找不到吴昊阳贴纸 $labDir\wu-2d.png"
}

$port = 8937

Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  背景实验室 - A版小样' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# 已有同端口服务在跑则直接复用，不重复启动（服务根即 lab-a-base，故无 /lab-a-base 前缀）
$reuse = $false
try {
  $check = Invoke-WebRequest -Uri "http://127.0.0.1:$port/lab-a.html" -TimeoutSec 3 -UseBasicParsing
  if ($check.StatusCode -eq 200) { $reuse = $true }
} catch { }

if (-not $reuse) {
  Write-Host "[1/2] Starting lab-a server (port $port)..." -ForegroundColor Yellow
  $python = 'python3'
  if (-not (Get-Command $python -ErrorAction SilentlyContinue)) {
    $python = 'python'
  }
  if (-not (Get-Command $python -ErrorAction SilentlyContinue)) {
    throw '启动失败：找不到 python3/python，请先安装 Python 3'
  }
  Start-Process -FilePath $python -ArgumentList '-m', 'http.server', "$port", '--bind', '127.0.0.1', '--directory', "`"$labDir`"" -WindowStyle Minimized
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
      $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$port/lab-a.html" -TimeoutSec 3 -UseBasicParsing
      if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
  }
  if (-not $ready) { throw "启动失败：实验室服务30轮健康等待未通过，请检查端口 $port 是否被占用" }
} else {
  Write-Host '[1/2] Lab server already running, reuse.' -ForegroundColor DarkGray
}

Write-Host '[2/2] Opening preview pages...' -ForegroundColor Yellow
Start-Process "http://127.0.0.1:$port/lab-a.html?theme=light"
Start-Sleep -Seconds 1
Start-Process "http://127.0.0.1:$port/lab-a.html?theme=dark"

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host "  白天金： http://127.0.0.1:$port/lab-a.html?theme=light" -ForegroundColor Green
Write-Host "  夜晚紫： http://127.0.0.1:$port/lab-a.html?theme=dark" -ForegroundColor Green
Write-Host '  审阅：鼠标挪四角，看右下吴昊阳是否穿帮，YOUNG是否可辨' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host '关闭本窗口不停止服务；停止服务请关闭 python http.server 窗口。' -ForegroundColor DarkGray
