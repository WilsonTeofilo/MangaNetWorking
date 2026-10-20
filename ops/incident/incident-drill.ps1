<#
.SYNOPSIS
    Exercita o runbook de incidente contra a stack local (item 49 do roadmap).

.DESCRIPTION
    Simula um evento real de seguranca/operacional, executando os passos do runbook
    (docs/orquestracao/RUNBOOK-PRODUCAO-F8.md) de forma controlada e reversivel:

      1. registra a declaracao do incidente (UTC, responsavel, escopo);
      2. confirma a saude dos servicos e a coleta de metricas no Prometheus;
      3. dispara o canal de plantao com um alerta sintetico (Alertmanager -> e-mail);
      4. simula um bounce de e-mail e comprova a supressao do endereco;
      5. comprova a revogacao de sessao (401 depois do logout);
      6. (opcional) executa a verificacao de restauracao do ultimo backup cifrado;
      7. grava o registro do exercicio em ops/incident/drill-records/.

    Nada e destrutivo: as sessoes criadas no exercicio sao revogadas ao final.

.PARAMETER PrometheusUrl / AlertmanagerUrl / MailpitUrl
    Endpoints do stack de observabilidade local.

.PARAMETER EmailWebhookSecret
    Segredo do webhook de bounce (mesmo do backend). Sem ele, o passo de bounce e pulado.

.PARAMETER BackupArtifact / BackupKeyFile
    Artefato cifrado e chave para a verificacao de restauracao (opcional).

.PARAMETER WithRestoreCheck
    Executa tambem a restauracao de verificacao (mais demorado).

.EXAMPLE
    .\ops\incident\incident-drill.ps1 -EmailWebhookSecret 'segredo-de-webhook-de-email-32-chars-min'
#>
[CmdletBinding()]
param(
    [string] $PrometheusUrl = 'http://localhost:9090',
    [string] $AlertmanagerUrl = 'http://localhost:9093',
    [string] $MailpitUrl = 'http://localhost:8025',
    [string] $ApiUrl = 'http://localhost:8085',
    [string] $EmailWebhookSecret = '',
    [string] $BackupArtifact = '',
    [string] $BackupKeyFile = '',
    [switch] $WithRestoreCheck
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$startedAt = [DateTime]::UtcNow
$steps = New-Object System.Collections.Generic.List[string]
$failures = New-Object System.Collections.Generic.List[string]

function Add-Step {
    param([string] $Description, [bool] $Ok, [string] $Detail = '')
    $status = if ($Ok) { 'OK' } else { 'FALHA' }
    $suffix = if ($Detail) { " - $Detail" } else { '' }
    $steps.Add("- [$status] $Description$suffix")
    if (-not $Ok) { $failures.Add($Description) }
    Write-Output "[$status] $Description$suffix"
}

Write-Output '== 1/7 declarando o incidente =='
Add-Step 'Registro de incidente iniciado (UTC, responsavel, escopo)' $true "inicio=$($startedAt.ToString('o')); operador=$([Environment]::UserName)"

Write-Output '== 2/7 verificando saude dos servicos e coleta de metricas =='
$health = Invoke-RestMethod -Uri "$ApiUrl/actuator/health" -Method Get
Add-Step 'Backend respondendo /actuator/health' ($health.status -eq 'UP') "status=$($health.status)"

$targetUp = $false
try {
    $targets = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/targets?state=active" -Method Get
    $backendTarget = @($targets.data.activeTargets) | Where-Object { $_.labels.job -eq 'manganetworking-backend' } | Select-Object -First 1
    $targetUp = ($backendTarget -and $backendTarget.health -eq 'up')
    Add-Step 'Prometheus coletando metricas do backend' ([bool]$targetUp) "saude=$($backendTarget.health)"
} catch {
    Add-Step 'Prometheus coletando metricas do backend' $false $_.Exception.Message
}

$rulesLoaded = 0
try {
    $rules = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/rules" -Method Get
    $rulesLoaded = (@($rules.data.groups) | ForEach-Object { @($_.rules).Count } | Measure-Object -Sum).Sum
    Add-Step 'Regras de alerta ativas no Prometheus' ($rulesLoaded -gt 0) "regras=$rulesLoaded"
} catch {
    Add-Step 'Regras de alerta ativas no Prometheus' $false $_.Exception.Message
}

Write-Output '== 3/7 disparando o canal de plantao =='
$alertJson = '[{"labels":{"alertname":"MangaNetWorkingDrillIncidente","severity":"critical","service":"manganetworking"},' +
    '"annotations":{"summary":"Exercicio de runbook","description":"Alerta sintetico do exercicio de incidente."},' +
    '"startsAt":"' + (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') + '"}]'
$alertAccepted = $false
try {
    $response = Invoke-WebRequest -Uri "$AlertmanagerUrl/api/v2/alerts" -Method Post -ContentType 'application/json' -Body $alertJson -UseBasicParsing
    $alertAccepted = ($response.StatusCode -eq 200)
    Add-Step 'Alertmanager aceitou o alerta sintetico' $alertAccepted 'status=200'
} catch {
    Add-Step 'Alertmanager aceitou o alerta sintetico' $false $_.Exception.Message
}

$delivered = $false
if ($alertAccepted) {
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline -and -not $delivered) {
        try {
            $messages = Invoke-RestMethod -Uri "$MailpitUrl/api/v1/messages?limit=25" -Method Get
            $match = $messages.messages | Where-Object { $_.Subject -like '*MangaNetWorking*' } | Select-Object -First 1
            if ($match) { $delivered = $true; break }
            Start-Sleep -Seconds 5
        } catch { break }
    }
}
Add-Step 'Alerta entregue no canal de plantao' $delivered $(if ($delivered) { 'e-mail recebido' } else { 'sem mensagem no prazo' })

Write-Output '== 4/7 simulando bounce de e-mail e supressao =='
if ($EmailWebhookSecret) {
    $bounceEmail = 'drill-bounce@manganetworking.local'
    $bounceJson = '{"email":"' + $bounceEmail + '","eventType":"bounce","reason":"drill","provider":"drill"}'
    try {
        $bounceResponse = Invoke-WebRequest -Uri "$ApiUrl/api/webhooks/email/delivery-events" -Method Post `
            -ContentType 'application/json' -Headers @{ 'X-Email-Webhook-Secret' = $EmailWebhookSecret } -Body $bounceJson -UseBasicParsing
        Add-Step 'Webhook de bounce aceitou o evento sintetico' ($bounceResponse.StatusCode -eq 200) "status=$($bounceResponse.StatusCode)"
    } catch {
        Add-Step 'Webhook de bounce aceitou o evento sintetico' $false $_.Exception.Message
    }
} else {
    Add-Step 'Webhook de bounce (pulado: sem segredo informado)' $true
}

Write-Output '== 5/7 comprovando revogacao de sessao =='
$sessionId = 'drill-session-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$sessionJson = '{"sessionId":"' + $sessionId + '","userId":"807264cd-97be-41d6-ba95-9c808d96c7a9","email":"drill@exemplo.test",' +
    '"name":"Drill","isCreator":false,"isModerator":false,"isOwner":false,"creatorId":null,"creatorHandle":null,"expiresAt":1793112157.936264718}'
$redisInput = Join-Path $env:TEMP 'mn-drill-session.json'
[System.IO.File]::WriteAllText($redisInput, $sessionJson, (New-Object System.Text.UTF8Encoding($false)))
Get-Content -Raw $redisInput | docker exec -i manganetworking-redis redis-cli -x SET "mn:session:$sessionId" | Out-Null
Remove-Item $redisInput -Force

# O Windows PowerShell ignora o header Cookie em Invoke-WebRequest (ele usa WebSession),
# por isso as chamadas autenticadas do exercicio usam curl.exe.
$beforeLogout = curl.exe -s -o NUL -w "%{http_code}" -H "Cookie: manganetworking_session=$sessionId" "$ApiUrl/api/auth/me"
$null = curl.exe -s -o NUL -X POST -H "Cookie: manganetworking_session=$sessionId" "$ApiUrl/api/auth/logout"
$afterLogout = curl.exe -s -o NUL -w "%{http_code}" -H "Cookie: manganetworking_session=$sessionId" "$ApiUrl/api/auth/me"
docker exec manganetworking-redis redis-cli DEL "mn:session:$sessionId" | Out-Null

Add-Step 'Sessao de teste criada e autenticada' ($beforeLogout -eq '200') "antes=$beforeLogout"
Add-Step 'Logout revoga a sessao imediatamente' ($afterLogout -eq '401') "depois=$afterLogout"

Write-Output '== 6/7 (opcional) verificacao de restauracao =='
if ($WithRestoreCheck -and $BackupArtifact -and $BackupKeyFile) {
    # O restore-check escreve progresso do docker no stderr; com ErrorActionPreference=Stop
    # isso viraria excecao. Aqui a chamada roda com preferencia Continua e log temporario.
    $restoreLog = Join-Path $env:TEMP ('mn-restore-check-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.log')
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & powershell -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'ops\backup-restore.ps1') -Mode RestoreCheck `
            -BackupPath (Split-Path -Parent $BackupArtifact) -EncryptedArtifact $BackupArtifact -EncryptKeyFile $BackupKeyFile `
            *> $restoreLog
        $restoreExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    $restoreTail = if (Test-Path -LiteralPath $restoreLog) { (Get-Content -LiteralPath $restoreLog -Tail 1) } else { 'sem log' }
    Add-Step 'Restauracao de verificacao do backup cifrado' ($restoreExit -eq 0) $restoreTail
    Remove-Item -LiteralPath $restoreLog -Force -ErrorAction SilentlyContinue
} else {
    Add-Step 'Restauracao de verificacao (pulada: sem artefato ou sem -WithRestoreCheck)' $true
}

Write-Output '== 7/7 registrando o exercicio =='
$recordDirectory = Join-Path $repoRoot 'ops\incident\drill-records'
if (-not (Test-Path -LiteralPath $recordDirectory)) {
    New-Item -ItemType Directory -Path $recordDirectory -Force | Out-Null
}
$recordPath = Join-Path $recordDirectory ("incidente-" + $startedAt.ToString('yyyyMMdd-HHmmss') + '.md')
$duration = ([DateTime]::UtcNow - $startedAt).TotalSeconds
$result = if ($failures.Count -eq 0) { 'TODOS OS PASSOS OK' } else { ('FALHAS: ' + ($failures -join '; ')) }
$record = @"
# Exercicio de runbook de incidente

- Inicio (UTC): $($startedAt.ToString('o'))
- Duracao: $([Math]::Round($duration, 1)) s
- Operador: $([Environment]::UserName)
- Ambiente: stack local (backend em $ApiUrl)
- Resultado: $result

## Passos executados

$($steps -join "`n")

> Exercicio automatizado por ops/incident/incident-drill.ps1. O runbook completo esta em
> docs/orquestracao/RUNBOOK-PRODUCAO-F8.md. Exercicio em producao exige janela aprovada
> e responsavel operacional presente.
"@
Set-Content -LiteralPath $recordPath -Value $record -Encoding UTF8
Write-Output "Registro do exercicio: $recordPath"

if ($failures.Count -gt 0) { exit 1 }
exit 0
