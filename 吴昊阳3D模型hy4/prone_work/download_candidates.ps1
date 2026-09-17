$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = "D:\xuanr\Desktop\燃烧之陨我的世界服务端\和我恋爱吧\吴昊阳3D模型hy4"
$cand = Join-Path $root "candidates"
$log  = Join-Path $root "prone_work\_download.txt"
New-Item -ItemType Directory -Force -Path $cand | Out-Null

$urls = @(
  @{n="Xbot.glb";      u="https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb"},
  @{n="Soldier.glb";   u="https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb"},
  @{n="Michelle.glb";  u="https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb"},
  @{n="CesiumMan.glb"; u="https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb"}
)

$lines = @()
foreach ($i in $urls) {
  $dst = Join-Path $cand $i.n
  if (Test-Path $dst) { Remove-Item $dst -Force }
  $ok = $false
  $msg = ""
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $wc = New-Object System.Net.WebClient
      $wc.DownloadFile($i.u, $dst)
      $wc.Dispose()
      $sz = (Get-Item $dst).Length
      if ($sz -gt 1000) { $ok = $true; $msg = "OK " + $sz + " bytes (attempt " + $attempt + ")"; break }
      else { $msg = "too small " + $sz }
    } catch {
      $msg = "attempt " + $attempt + " error: " + $_.Exception.Message
      Start-Sleep -Seconds 2
    }
  }
  $lines += ($i.n + "  " + $msg + "  " + $i.u)
}

$lines += "--- files ---"
$lines += (Get-ChildItem -Path $cand -File | ForEach-Object { $_.Name + "  " + $_.Length })
$lines | Set-Content -Path $log -Encoding UTF8
