param(
    [Parameter(Mandatory = $true)][string]$IdsFile,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [int]$StartIndex = 0,
    [int]$Count = 5000,
    [int]$Concurrency = 10
)

$ErrorActionPreference = 'Continue'
$ids = Get-Content $IdsFile
$end = [Math]::Min($StartIndex + $Count, $ids.Count)
$metaFile = Join-Path $OutDir "_meta.jsonl"
$failFile = Join-Path $OutDir "_failures.txt"
$doneFile = Join-Path $OutDir "_done_count.txt"

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$queue = new-object System.Collections.Concurrent.ConcurrentQueue[string]
for ($i = $StartIndex; $i -lt $end; $i++) { $queue.Enqueue($ids[$i].Trim()) }

$script:okCount = 0
$script:errCount = 0
$script:lock = new-object object

$worker = {
    param($q, $metaPath, $failPath, $lk)
    while (-not $q.IsEmpty) {
        $id = $null
        if (-not $q.TryDequeue([ref]$id)) { break }
        if ($id -eq '') { continue }
        $ok = $false
        for ($attempt = 1; $attempt -le 3; $attempt++) {
            try {
                $r = Invoke-WebRequest -Uri "https://memecub.com/api/v1/memes/$id" -UseBasicParsing -TimeoutSec 25
                if ($r.StatusCode -eq 200) {
                    $data = ($r.Content | ConvertFrom-Json).data
                    $meta = [ordered]@{
                        id = $data.id
                        title = $data.title_zh
                        title_en = $data.title
                        description = $data.description
                        tags_zh = $data.tags_zh
                        tags = $data.tags
                        url = $data.url
                        thumb_url = $data.thumb_url
                        width = $data.width
                        height = $data.height
                        format = $data.format
                        kind = $data.kind
                        category = $data.category
                        commercial_use = $data.license.commercial_use
                        attribution_required = $data.license.attribution_required
                        license_name = $data.license.name
                        profane = $data.profane
                        page_url = $data.page_url
                    }
                    $line = ($meta | ConvertTo-Json -Compress -Depth 4)
                    [System.IO.File]::AppendAllText($metaPath, $line + "`n", [System.Text.Encoding]::UTF8)
                    $ok = $true
                    break
                }
            } catch {
                $msg = $_.Exception.Message
                if ($msg -match 'timed out' -or $msg -match 'aborted') { Start-Sleep -Seconds (2 * $attempt); continue }
                Start-Sleep -Milliseconds 500
            }
        }
        if (-not $ok) { [System.IO.File]::AppendAllText($failPath, $id + "`n", [System.Text.Encoding]::UTF8) }
    }
}

$runspaces = @()
$pool = [runspacefactory]::CreateRunspacePool(1, $Concurrency)
$pool.Open()
for ($w = 0; $w -lt $Concurrency; $w++) {
    $ps = [powershell]::Create()
    $ps.RunspacePool = $pool
    [void]$ps.AddScript($worker).AddArgument($queue).AddArgument($metaFile).AddArgument($failFile).AddArgument($script:lock)
    $runspaces += [pscustomobject]@{ PS = $ps; Handle = $ps.BeginInvoke() }
}
foreach ($rs in $runspaces) { $rs.PS.EndInvoke($rs.Handle); $rs.PS.Dispose() }
$pool.Close()

$metaCount = 0
if (Test-Path $metaFile) { $metaCount = (Get-Content $metaFile).Count }
$failCount = 0
if (Test-Path $failFile) { $failCount = (Get-Content $failFile).Count }
Set-Content -Path $doneFile -Value $metaCount
Write-Output ("BATCH DONE range=[$StartIndex..$end) ok=$metaCount fail=$failCount")
