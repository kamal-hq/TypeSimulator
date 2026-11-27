<#
.SYNOPSIS
    Builds the TypeSimulator v2 standalone Windows desktop installer (.exe).
.DESCRIPTION
    1. Builds the React/Vite frontend in desktop mode (VITE_RUNTIME_MODE=desktop, relative base).
    2. Generates multi-resolution Windows icon via Pillow.
    3. Bundles Python Engine v2 + PyWebView + frontend/dist via PyInstaller.
    4. Compiles the standalone Inno Setup installer into installer/output/TypeSimulator-Setup-v2.0.0.exe.
#>
$ErrorActionPreference = "Stop"

function Invoke-Checked {
    param([scriptblock]$Command, [string]$Label)
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

$Root = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $Root "frontend"
$IconScript = Join-Path $PSScriptRoot "make_icon.py"
$SpecFile = Join-Path $PSScriptRoot "typesimulator.spec"
$IssFile = Join-Path $PSScriptRoot "setup.iss"

Write-Host "[1/4] Building frontend (desktop mode)..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    if (-not (Test-Path "node_modules")) {
        Invoke-Checked { npm install } "npm install"
    }
    Invoke-Checked { npm run build:desktop } "npm run build:desktop"
} finally {
    Pop-Location
}

Write-Host "[2/4] Generating Windows application icon..." -ForegroundColor Cyan
Invoke-Checked { python $IconScript } "make_icon.py"

Write-Host "[3/4] Bundling desktop app with PyInstaller..." -ForegroundColor Cyan
Push-Location $Root
try {
    Invoke-Checked { python -m PyInstaller --noconfirm --clean $SpecFile } "PyInstaller"
} finally {
    Pop-Location
}

Write-Host "[4/4] Compiling standalone installer with Inno Setup..." -ForegroundColor Cyan
$Iscc = Get-Command iscc -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $Iscc) {
    $DefaultIscc = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    if (Test-Path $DefaultIscc) {
        $Iscc = $DefaultIscc
    }
}
if (-not $Iscc) {
    throw "Inno Setup 6 (ISCC.exe) not found. Install Inno Setup 6 or add it to PATH."
}

Invoke-Checked { & $Iscc $IssFile } "Inno Setup ISCC"

$InstallerOut = Join-Path $PSScriptRoot "output\TypeSimulator-Setup-v2.0.1.exe"
if (Test-Path $InstallerOut) {
    $SizeMB = [Math]::Round((Get-Item $InstallerOut).Length / 1MB, 2)
    Write-Host "`nSUCCESS: Built $InstallerOut ($SizeMB MB)" -ForegroundColor Green
} else {
    throw "Expected installer not found at $InstallerOut"
}
