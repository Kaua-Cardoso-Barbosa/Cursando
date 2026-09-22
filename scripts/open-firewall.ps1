$ErrorActionPreference = "Stop"

$ruleName = "Cursando Backend 5000"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existing) {
  Set-NetFirewallRule -DisplayName $ruleName -Enabled True -Action Allow | Out-Null
  Write-Host "Regra do firewall ja existia e foi reativada: $ruleName"
  exit 0
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort 5000 `
  -Profile Any | Out-Null

Write-Host "Porta 5000 liberada no Firewall do Windows."
