# ============================================================================
# setup-dev-env.ps1 - Automated Developer Environment Setup for RTL View
# بررسی و نصب خودکار پیش‌نیازهای توسعه‌دهنده (Node.js, Rust, C++ Build Tools)
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "      RTL View - Automated Developer Setup Check            " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. بررسی و نصب Node.js
Write-Host "==> [1/3] Checking Node.js ..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node --version
    Write-Host "    [OK] Node.js is already installed: $nodeVer" -ForegroundColor Green
} else {
    Write-Host "    [INSTALLING] Node.js not found. Installing LTS via winget..." -ForegroundColor Cyan
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Node.js installed successfully." -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Please download Node.js from https://nodejs.org/" -ForegroundColor DarkYellow
    }
}

# 2. بررسی و نصب Rust
Write-Host ""
Write-Host "==> [2/3] Checking Rust Toolchain ..." -ForegroundColor Yellow
$cargoBin = "$env:USERPROFILE\.cargo\bin"
if (Test-Path "$cargoBin\rustc.exe") {
    $rustVer = & "$cargoBin\rustc.exe" --version
    Write-Host "    [OK] Rust is already installed: $rustVer" -ForegroundColor Green
} elseif (Get-Command rustc -ErrorAction SilentlyContinue) {
    $rustVer = rustc --version
    Write-Host "    [OK] Rust is already installed: $rustVer" -ForegroundColor Green
} else {
    Write-Host "    [INSTALLING] Rust not found. Installing Rustup via winget..." -ForegroundColor Cyan
    winget install --id Rustlang.Rustup -e --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] Rust installed successfully." -ForegroundColor Green
    } else {
        Write-Host "    [WARNING] Please download Rust from https://rustup.rs/" -ForegroundColor DarkYellow
    }
}

# 3. بررسی ابزارهای C++ Build Tools
Write-Host ""
Write-Host "==> [3/3] Checking Microsoft C++ Build Tools ..." -ForegroundColor Yellow
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasMSVC = $false
if (Test-Path $vsWhere) {
    $msvcPath = & $vsWhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($msvcPath) {
        $hasMSVC = $true
        Write-Host "    [OK] Visual Studio C++ Build Tools found: $msvcPath" -ForegroundColor Green
    }
}

if (-not $hasMSVC) {
    Write-Host "    [NOTICE] C++ Build Tools is required only if compiling locally on Windows." -ForegroundColor DarkYellow
    Write-Host "    Note: If you build via GitHub Actions, this is NOT needed on your PC." -ForegroundColor Gray
    Write-Host "    Opening official installer download..." -ForegroundColor Cyan
    Start-Process "https://aka.ms/vs/17/release/vs_BuildTools.exe"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Setup check completed. You are ready to develop with Tauri v2!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
