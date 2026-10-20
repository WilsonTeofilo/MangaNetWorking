<#
.SYNOPSIS
    Renderiza, valida e aplica o canal de plantao (Alertmanager) e as regras de alerta (item 45).

.DESCRIPTION
    1. renderiza o modelo de configuracao do Alertmanager com os parametros do canal;
    2. valida a configuracao com amtool check-config (container oficial prom/alertmanager);
    3. valida as regras Prometheus com promtool check rules (container oficial prom/prometheus);
    4. confere as regras ativas no Prometheus (GET /api/v1/rules);
    5. injeta um alerta sintetico e confirma a entrega no canal de plantao (Mailpit local);
    6. grava o registro da verificacao em ops/alertmanager/drill-records/.

    Nenhum passo depende de credencial externa: o alerta sintetico prova o caminho
    Prometheus -> Alertmanager -> canal de plantao.

.PARAMETER SmtpSmarthost
    host:port do SMTP do canal (ex.: smtp.provedor.com:587 ou mailpit:1025).

.PARAMETER OnCallEmail / CriticalEmail
    Caixas de destino do canal de plantao.

.PARAMETER PrometheusUrl / AlertmanagerUrl / MailpitUrl
    Endpoints usados na verificacao.

.PARAMETER RenderedConfigPath
    Onde gravar a configuracao renderizada (padrao: ops/alertmanager/alertmanager.rendered.yml).

.PARAMETER SkipAlertTest
    Nao injeta o alerta sintetico.

.EXAMPLE
    .\ops\alertmanager\apply-alert-rules.ps1 -SmtpSmarthost 'mailpit:1025' -OnCallEmail 'plantao@local.test' -CriticalEmail 'critico@local.test' -SmtpUsername 'plantao' -SmtpPassword 'plantao' -SmtpFrom 'alertas@local.test' -SmtpRequireTls 'false'
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $SmtpSmarthost,

    [Parameter(Mandatory = $true)]
    [string] $OnCallEmail,

    [Parameter(Mandatory = $true)]
    [string] $CriticalEmail,

    [string] $SmtpUsername = '',

    [string] $SmtpPassword = '',

    [string] $SmtpFrom = 'alertas@manganetworking.local',

    [string] $SmtpRequireTls = 'true',

    [string] $PrometheusUrl = 'http://localhost:9090',

    [string] $AlertmanagerUrl = 'http://localhost:9093',

    [string] $MailpitUrl = 'http://localhost:8025',

    [string] $RenderedConfigPath,

    [switch] $SkipAlertTest
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$rulesPath = Join-Path $repoRoot 'ops\prometheus\manganetworking-alerts.yml'
$templatePath = Join-Path $repoRoot 'ops\alertmanager\alertmanager.yml.template'
if (-not $RenderedConfigPath) {
    $RenderedConfigPath = Join-Path $repoRoot 'ops\alertmanager\alertmanager.rendered.yml'
}

if (-not (Test-Path -LiteralPath $rulesPath)) { throw "Regras nao encontradas: $rulesPath" }
if (-not (Test-Path -LiteralPath $templatePath)) { throw "Modelo do Alertmanager nao encontrado: $templatePath" }

Write-Output '== 1/5 renderizando a configuracao do canal de plantao =='
$rendered = Get-Content -LiteralPath $templatePath -Raw -Encoding UTF8
$rendered = $rendered.Replace('{{SMTP_SMARTHOST}}', $SmtpSmarthost)
$rendered = $rendered.Replace('{{ONCALL_EMAIL}}', $OnCallEmail)
$rendered = $rendered.Replace('{{CRITICAL_EMAIL}}', $CriticalEmail)
$rendered = $rendered.Replace('{{SMTP_USERNAME}}', $SmtpUsername)
$rendered = $rendered.Replace('{{SMTP_PASSWORD}}', $SmtpPassword)
$rendered = $rendered.Replace('{{SMTP_FROM}}', $SmtpFrom)
$rendered = $rendered.Replace('{{SMTP_REQUIRE_TLS}}', $SmtpRequireTls)
if ($rendered -match '\{\{[A-Z_]+\}\}') {
    throw "A configuracao renderizada ainda contem placeholders: $($Matches[0])"
}
[IO.File]::WriteAllText($RenderedConfigPath, $rendered, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Configuracao renderizada: $RenderedConfigPath"

Write-Output '== 2/5 validando configuracao do Alertmanager (amtool) =='
docker run --rm --entrypoint amtool -v "${RenderedConfigPath}:/etc/alertmanager/alertmanager.yml:ro" prom/alertmanager:latest check-config /etc/alertmanager/alertmanager.yml
if ($LASTEXITCODE -ne 0) { throw "amtool reprovou a configuracao (exit $LASTEXITCODE)." }

Write-Output '== 3/5 validando regras Prometheus (promtool) =='
docker run --rm --entrypoint promtool -v "${rulesPath}:/rules.yml:ro" prom/prometheus:latest check rules /rules.yml
if ($LASTEXITCODE -ne 0) { throw "promtool reprovou as regras (exit $LASTEXITCODE)." }

Write-Output '== 4/5 conferindo as regras ativas no Prometheus =='
$prometheusLoaded = $false
$loadedRuleCount = 0
try {
    $rulesResponse = Invoke-RestMethod -Uri "$PrometheusUrl/api/v1/rules" -Method Get
    $groups = @($rulesResponse.data.groups)
    $loadedRuleCount = ($groups | ForEach-Object { @($_.rules).Count } | Measure-Object -Sum).Sum
    $prometheusLoaded = $loadedRuleCount -gt 0
    Write-Output "Prometheus reportou $loadedRuleCount regra(s) em $($groups.Count) grupo(s)."
} catch {
    Write-Output "Nao foi possivel consultar as regras no Prometheus: $($_.Exception.Message)"
}

Write-Output '== 5/5 injetando alerta sintetico e comprobando a entrega no canal =='
$alertFile = Join-Path $env:TEMP 'mn-alert.json'
$alertJson = '[{"labels":{"alertname":"MangaNetWorkingCanalPlantaoTeste","severity":"critical","service":"manganetworking"},' +
    '"annotations":{"summary":"Teste de canal de plantao","description":"Alerta sintetico para comprovar o caminho ate o canal de plantao."},' +
    '"startsAt":"' + (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ') + '"}]'
[IO.File]::WriteAllText($alertFile, $alertJson, (New-Object System.Text.UTF8Encoding($false)))
$alertAccepted = $false
try {
    $alertResponse = Invoke-WebRequest -Uri "$AlertmanagerUrl/api/v2/alerts" -Method Post -ContentType 'application/json' -InFile $alertFile -UseBasicParsing
    $alertAccepted = ($alertResponse.StatusCode -eq 200)
    Write-Output "Alertmanager aceitou o alerta (status $($alertResponse.StatusCode))."
} catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    Write-Output "Alertmanager nao aceitou o alerta (status $status): $($_.Exception.Message)"
} finally {
    Remove-Item $alertFile -Force -ErrorAction SilentlyContinue
}

$delivered = $false
if (-not $SkipAlertTest -and $alertAccepted) {
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline -and -not $delivered) {
        try {
            $messages = Invoke-RestMethod -Uri "$MailpitUrl/api/v1/messages?limit=25" -Method Get
            $match = $messages.messages | Where-Object {
                $_.Subject -like '*MangaNetWorking*' -or $_.Subject -like '*CRITICO*'
            } | Select-Object -First 1
            if ($match) {
                $delivered = $true
                Write-Output "Alerta entregue no canal de plantao: assunto '$($match.Subject)'."
            } else {
                Start-Sleep -Seconds 5
            }
        } catch {
            Write-Output "Mailpit indisponivel: $($_.Exception.Message)"
            break
        }
    }
    if (-not $delivered) { Write-Output 'Entrega no canal nao confirmada (Mailpit sem mensagem correspondente no prazo).' }
}

$recordDirectory = Join-Path $repoRoot 'ops\alertmanager\drill-records'
if (-not (Test-Path -LiteralPath $recordDirectory)) {
    New-Item -ItemType Directory -Path $recordDirectory -Force | Out-Null
}
$recordPath = Join-Path $recordDirectory ("canal-plantao-" + (Get-Date).ToString('yyyyMMdd-HHmmss') + '.md')
$record = @"
# Verificacao do canal de plantao

- Data (UTC): $((Get-Date).ToUniversalTime().ToString('o'))
- Regras validadas: promtool check rules OK
- Configuracao do Alertmanager validada: amtool check-config OK
- Prometheus reportou regras ativas: $prometheusLoaded ($loadedRuleCount regra(s))
- Alertmanager aceitou alerta sintetico: $alertAccepted
- Entrega confirmada no canal de plantao (Mailpit): $delivered
- Endpoints: Prometheus $PrometheusUrl | Alertmanager $AlertmanagerUrl

> Procedimento automatizado por ops/alertmanager/apply-alert-rules.ps1. O canal real de
> plantao (e-mail/SMS institucional) continua pendente de decisao organizacional: os
> enderecos do modelo ops/alertmanager/alertmanager.yml.template sao placeholders
> renderizados no momento da instalacao.
"@
Set-Content -LiteralPath $recordPath -Value $record -Encoding UTF8
Write-Output "Registro da verificacao: $recordPath"

if (-not $alertAccepted) { exit 1 }
exit 0
