# Links the full legacy Angular app into external-src/ for local reference (not built or committed).
param(
    [string]$AngularPath = "C:\Users\shrav\Desktop\goldcollegeerp_2024_dev3"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$externalDir = Join-Path $repoRoot "external-src"

if (-not (Test-Path $AngularPath)) {
    Write-Error "Angular source not found: $AngularPath`nPass -AngularPath if your clone is elsewhere."
}

New-Item -ItemType Directory -Force -Path $externalDir | Out-Null

function Ensure-Junction {
    param([string]$LinkPath, [string]$Target)
    if (Test-Path $LinkPath) {
        $item = Get-Item $LinkPath -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            Write-Host "Already linked: $LinkPath"
            return
        }
        Write-Error "Path exists and is not a junction: $LinkPath`nRemove it manually, then re-run."
    }
    cmd /c mklink /J "$LinkPath" "$Target"
    Write-Host "Created junction:`n  $LinkPath`n  -> $Target"
}

Ensure-Junction -LinkPath (Join-Path $externalDir "angular") -Target $AngularPath
Ensure-Junction -LinkPath (Join-Path $externalDir "goldcollegeerp_2024_dev3") -Target $AngularPath

Write-Host "`nFull Angular app is available at:"
Write-Host "  external-src/angular/"
Write-Host "  external-src/goldcollegeerp_2024_dev3/"
