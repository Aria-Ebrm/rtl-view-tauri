# ============================================================================
# build-all.ps1 - Unified Cross-Platform Builder for RTL View (Tauri v2)
# ASCII-only encoding for 100% compatibility with Windows PowerShell 5.1 & 7+
# ============================================================================

param(
    [switch]$SkipLinux = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $projectRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   RTL View - Cross-Platform Unified Builder (Tauri v2)     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Add Cargo to PATH if not currently found
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    $cargoBin = "$env:USERPROFILE\.cargo\bin"
    if (Test-Path $cargoBin) {
        $env:PATH = "$cargoBin;$env:PATH"
        Write-Host "    Added Cargo to session PATH: $cargoBin" -ForegroundColor Gray
    }
}

# 2. Build Windows Application
Write-Host "==> [1/3] Building Windows Release (Installer & Portable) ..." -ForegroundColor Yellow
npx --yes @tauri-apps/cli build
if ($LASTEXITCODE -eq 0) {
    Write-Host "    [OK] Windows builds completed successfully!" -ForegroundColor Green
    Write-Host "    Output directory: src-tauri\target\release\bundle\" -ForegroundColor Gray
} else {
    Write-Host "    [ERROR] Windows build failed (exit code: $LASTEXITCODE)." -ForegroundColor Red
    Write-Host "    Note: On Windows, Rust MSVC requires Microsoft C++ Build Tools (link.exe)." -ForegroundColor DarkYellow
    Write-Host "    Install via: Visual Studio Installer -> Desktop development with C++" -ForegroundColor DarkYellow
}

# 3. Check for Linux Build capability via WSL
Write-Host ""
if (-not $SkipLinux) {
    Write-Host "==> [2/3] Checking Linux build capability (WSL / Docker) ..." -ForegroundColor Yellow
    $wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
    if ($wslAvailable) {
        Write-Host "    [OK] WSL detected. You can build Linux .deb and .AppImage packages:" -ForegroundColor Green
        $wslPath = wsl wslpath -a "$projectRoot"
        Write-Host "    WSL Path: $wslPath" -ForegroundColor Gray
        Write-Host "    Run in terminal: wsl bash -c `"cd '$wslPath' && npx @tauri-apps/cli build`"" -ForegroundColor Cyan
    } else {
        Write-Host "    [INFO] WSL not detected. Install WSL2 or Docker to produce Linux builds locally." -ForegroundColor DarkYellow
    }
}

# 4. macOS Build Guidance
Write-Host ""
Write-Host "==> [3/3] macOS Build (Intel & Apple Silicon DMG) ..." -ForegroundColor Yellow
Write-Host "    Due to Apple ecosystem requirements (Cocoa & codesigning), macOS builds" -ForegroundColor Gray
Write-Host "    are automated via GitHub Actions (.github/workflows/release.yml)." -ForegroundColor Gray
Write-Host "    Pushing a git release tag triggers cloud runners to build .dmg and .app files." -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Done." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
