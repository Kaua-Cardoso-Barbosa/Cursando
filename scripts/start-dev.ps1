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

function Get-PortOwner {
  param([int] $Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $connection) {
    return $null
  }

  return Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)"
}

function Test-BackendHealth {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
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

function Get-DevHostIp {
  $configs = Get-NetIPConfiguration |
    Where-Object {
      $_.IPv4Address -and
      $_.NetAdapter.Status -eq "Up" -and
      $_.IPv4DefaultGateway
    }

  $wifi = $configs | Where-Object { $_.InterfaceAlias -match "Wi-Fi|Wireless|WLAN" } | Select-Object -First 1
  $selected = if ($wifi) { $wifi } else { $configs | Select-Object -First 1 }

  if (-not $selected) {
    throw "Nao foi possivel identificar o IP local. Verifique se o computador esta conectado a rede."
  }

  return $selected.IPv4Address.IPAddress
}

function Enable-BackendFirewallAccess {
  $ruleName = "Cursando Backend 5000"

  try {
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) {
      Set-NetFirewallRule -DisplayName $ruleName -Enabled True -Action Allow | Out-Null
      return
    }

    New-NetFirewallRule `
      -DisplayName $ruleName `
      -Direction Inbound `
      -Action Allow `
      -Protocol TCP `
      -LocalPort 5000 `
      -Profile Any | Out-Null
  } catch {
    Write-Host "Nao consegui liberar a porta 5000 no Firewall automaticamente."
    Write-Host "Abra o PowerShell como Administrador e rode novamente: npm start"
  }
}

function Enable-AdbReverseIfAvailable {
  $adb = Get-Command adb.exe -ErrorAction SilentlyContinue
  if (-not $adb) {
    return
  }

  try {
    $devices = & $adb.Source devices
    $hasDevice = $devices | Select-String -Pattern "\tdevice$" -Quiet
    if (-not $hasDevice) {
      return
    }

    & $adb.Source reverse tcp:5000 tcp:5000 | Out-Null
    Write-Host "ADB reverse ativo: celular Android USB consegue acessar a API em http://127.0.0.1:5000"
  } catch {
    Write-Host "Nao foi possivel configurar ADB reverse automaticamente."
  }
}

if (-not (Test-Path $python)) {
  Write-Host "Criando ambiente Python do backend..."
  py -3 -m venv $venv
}

Write-Host "Instalando/atualizando dependencias do backend..."
& $python -m pip install --disable-pip-version-check -r (Join-Path $backend "requirements.txt")
Enable-BackendFirewallAccess

if (Test-PortOpen -Port 5000) {
  if (Test-BackendHealth) {
    Write-Host "Backend ja esta rodando na porta 5000."
  } else {
    $owner = Get-PortOwner -Port 5000
    $commandLine = $owner.CommandLine
    $isPythonBackend = $owner.Name -match "python" -and $commandLine -match "main.py|server.py|waitress"
    if (($commandLine -and $commandLine.Contains($backend)) -or $isPythonBackend) {
      Write-Host "Reiniciando backend antigo na porta 5000..."
      Stop-Process -Id $owner.ProcessId -Force
      Start-Sleep -Seconds 1
    } else {
      throw "A porta 5000 esta ocupada por outro processo. Feche esse processo ou libere a porta antes de rodar novamente."
    }
  }
}

if (-not (Test-PortOpen -Port 5000)) {
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
$devHostIp = Get-DevHostIp
$env:EXPO_PUBLIC_API_URL = "http://${devHostIp}:5000"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $devHostIp
Enable-AdbReverseIfAvailable

Write-Host "API do app configurada em $env:EXPO_PUBLIC_API_URL"
Write-Host "Iniciando Expo em modo LAN na porta $expoPort..."
Set-Location $mobile
npx.cmd expo start --lan --clear --port $expoPort
