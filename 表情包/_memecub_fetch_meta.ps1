param(
    [Parameter(Mandatory = $true)][string]$IdsFile,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [int]$StartIndex = 0,
    [int]$Count = 2000,
    [int]$RateDelayMs = 6200
)

$ErrorActionPreference = 'Continue'
$ids = Get-Content $IdsFile
$end = [Math]::Min($StartIndex + $Count, $ids.Count)
$progressFile = Join-Path $OutDir "_progress.txt"
$metaFile = Join-Path $OutDir "_meta.jsonl"
$failFile = Join-Path $OutDir "_failures.txt"

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$processed = @{}
if (Test-Path $progressFile) { Get-Content $progressFile | ForEach-Object { $processed[$_.Trim()] = $true } }

function Get-Meme ([string]$id) {
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            $r = Invoke-WebRequest -Uri "https://memecub.com/api/v1/memes/$id" -UseBasicParsing -TimeoutSec 25
            return ($r.Content | ConvertFrom-Json).data
        } catch {
            $msg = $_.Exception.Message
            if ($msg -match '429' -or $msg -match 'rate') {
                Start-Sleep -Seconds 65
                continue
            }
            if ($attempt -eq 3) { return $null }
            Start-Sleep -Seconds 2
        }
    }
    return $null
}

$done = 0
for ($i = $StartIndex; $i -lt $end; $i++) {
    $id = $ids[$i].Trim()
    if ($id -eq '' -or $processed.ContainsKey($id)) { continue }

    $meme = Get-Meme $id
    if ($null -eq $meme) {
        Add-Content -Path $failFile -Value $id
        Add-Content -Path $progressFile -Value $id
        continue
    }

    $meta = [ordered]@{
        id = $meme.id
        title = $meme.title_zh
        title_en = $meme.title
        description = $meme.description
        tags_zh = $meme.tags_zh
        tags = $meme.tags
        url = $meme.url
        thumb_url = $meme.thumb_url
        width = $meme.width
        height = $meme.height
        format = $meme.format
        kind = $meme.kind
        category = $meme.category
        commercial_use = $meme.license.commercial_use
        attribution_required = $meme.license.attribution_required
        license_name = $meme.license.name
        profane = $meme.profane
        page_url = $meme.page_url
    }
    $line = ($meta | ConvertTo-Json -Compress -Depth 4)
    Add-Content -Path $metaFile -Value $line -Encoding UTF8
    Add-Content -Path $progressFile -Value $id
    $done++
    if ($done % 20 -eq 0) { Write-Output ("fetched {0}/{1}" -f ($i - $StartIndex + 1), ($end - $StartIndex)) }
    Start-Sleep -Milliseconds $RateDelayMs
}
Write-Output ("BATCH DONE. fetched this run: " + $done)
