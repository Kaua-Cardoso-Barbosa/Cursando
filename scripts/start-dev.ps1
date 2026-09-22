$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$mobile = Join-Path $root "mobile"
$venv = Join-Path $backend ".venv"
$python = Join-Path $venv "Scripts\python.exe"
$pip = Join-Path $venv "Scripts\pip.exe"

function Test-PortOpen {
  param([int] $Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return $null -ne $connection
}

function Get-OpenPort {
  param(
    [int] $StartPort,
    [int] $EndPort
  )

  for ($port = $StartPort; $port -le $EndPort; $port++) {
    if (-not (Test-PortOpen -Port $port)) {
      return $port
    }
  }

  throw "Nenhuma porta livre encontrada entre $StartPort e $EndPort."
}

if (-not (Test-Path $python)) {
  Write-Host "Criando ambiente Python do backend..."
  py -3 -m venv $venv
}

Write-Host "Instalando/atualizando dependencias do backend..."
& $python -m pip install --disable-pip-version-check -r (Join-Path $backend "requirements.txt")

if (Test-PortOpen -Port 5000) {
  Write-Host "Backend ja esta rodando na porta 5000."
} else {
  Write-Host "Iniciando backend em http://0.0.0.0:5000..."
  Start-Process `
    -FilePath $python `
    -ArgumentList "server.py" `
    -WorkingDirectory $backend `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $backend "mobile-backend.out.log") `
    -RedirectStandardError (Join-Path $backend "mobile-backend.err.log")

  Start-Sleep -Seconds 2
}

$expoPort = Get-OpenPort -StartPort 8081 -EndPort 8090
Write-Host "Iniciando Expo em modo LAN na porta $expoPort..."
Set-Location $mobile
npx.cmd expo start --lan --port $expoPort
