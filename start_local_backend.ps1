# ============================================================
# SIG PTPN - Start Local Backend + Cloudflare Tunnel
# Otomatis update URL ke Config Web App setiap restart
# ============================================================

$BACKEND_DIR     = "D:\kuliah praktik\PTPN\SIG PTPN\backend"
$CLOUDFLARED     = "$env:USERPROFILE\Downloads\cloudflared.exe"
$PORT            = 8000
$SECRET_KEY      = "ptpn-sig-config-2026"

# === ISI INI SETELAH DEPLOY google_config_webapp.js ===
$CONFIG_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxm74hXWNH0RKZa6Bdn3kXLvS2XI9cKOUFsVGqlkB9sTsahK7y8DbODrneynGk9ED4WAw/exec"
# ======================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SIG PTPN - Local Backend Launcher" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if (-not (Test-Path $CLOUDFLARED)) {
    Write-Host "[ERROR] cloudflared.exe tidak ditemukan!" -ForegroundColor Red
    exit 1
}

# 1. Jalankan backend FastAPI di background
Write-Host "`n[1/3] Menjalankan backend FastAPI di port $PORT..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($dir, $port)
    Set-Location $dir
    & "$dir\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port $port
} -ArgumentList $BACKEND_DIR, $PORT
Start-Sleep -Seconds 4
Write-Host "      Backend siap." -ForegroundColor Gray

# 2. Jalankan tunnel dan tangkap URL dari output
Write-Host "`n[2/3] Membuat Cloudflare Quick Tunnel..." -ForegroundColor Green

$tunnelUrl  = $null
$logFile    = "$env:TEMP\cloudflared_tunnel.log"

# Jalankan cloudflared sebagai proses background, redirect stderr ke file log
$tunnelProc = Start-Process -FilePath $CLOUDFLARED `
    -ArgumentList "tunnel --url http://localhost:$PORT --no-autoupdate" `
    -RedirectStandardError $logFile `
    -PassThru -WindowStyle Hidden

# Tunggu URL muncul di log (max 30 detik)
$maxWait = 30
$waited  = 0
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
    if (Test-Path $logFile) {
        $logContent = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
        if ($logContent -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $tunnelUrl = $Matches[0]
            break
        }
    }
}

if (-not $tunnelUrl) {
    Write-Host "[ERROR] Gagal menangkap URL tunnel. Cek koneksi internet." -ForegroundColor Red
    Stop-Job $backendJob; Remove-Job $backendJob
    Stop-Process -Id $tunnelProc.Id -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "  ║  URL TUNNEL AKTIF:                                       ║" -ForegroundColor Yellow
Write-Host "  ║  $tunnelUrl" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

# Salin URL ke clipboard
$tunnelUrl | Set-Clipboard
Write-Host "  URL sudah disalin ke clipboard!" -ForegroundColor Cyan

# 3. POST URL ke Config Web App (jika sudah dikonfigurasi)
Write-Host "`n[3/3] Mengupdate Config Web App..." -ForegroundColor Green
if ($CONFIG_WEBAPP_URL -ne "") {
    try {
        $body = @{ secret = $SECRET_KEY; url = $tunnelUrl } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri $CONFIG_WEBAPP_URL -Method POST `
            -Body $body -ContentType "application/json" -TimeoutSec 10
        if ($response.status -eq "ok") {
            Write-Host "  Config Web App berhasil diupdate!" -ForegroundColor Green
            Write-Host "  Apps Script akan otomatis pakai URL baru ini." -ForegroundColor Gray
        } else {
            Write-Host "  Gagal update Config Web App: $($response | ConvertTo-Json)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Gagal menghubungi Config Web App: $_" -ForegroundColor Yellow
        Write-Host "  Pastikan CONFIG_WEBAPP_URL sudah diisi dengan benar." -ForegroundColor Yellow
    }
} else {
    Write-Host "  CONFIG_WEBAPP_URL belum diisi." -ForegroundColor Yellow
    Write-Host "  Deploy google_config_webapp.js lalu isi variabelnya." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Backend berjalan. Tekan Ctrl+C untuk menghentikan." -ForegroundColor Cyan
Write-Host ""

# Tampilkan log backend secara live
try {
    while ($true) {
        $jobOutput = Receive-Job $backendJob -ErrorAction SilentlyContinue
        if ($jobOutput) { Write-Host $jobOutput -ForegroundColor Gray }
        Start-Sleep -Seconds 2
    }
} finally {
    # Cleanup saat Ctrl+C
    Write-Host "`nMenghentikan semua proses..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Process -Id $tunnelProc.Id -ErrorAction SilentlyContinue
    Remove-Item $logFile -ErrorAction SilentlyContinue
    Write-Host "Selesai." -ForegroundColor Green
}
