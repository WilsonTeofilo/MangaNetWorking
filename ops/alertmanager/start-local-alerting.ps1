<#
.SYNOPSIS
    Sobe o stack local de observabilidade (Prometheus + Alertmanager) para comprovar o canal de plantao.

.DESCRIPTION
    Sobe dois containers oficiais (prom/prometheus e prom/alertmanager) na rede do Compose
    local, com as regras versionadas, o token de coleta do backend e a configuracao de canal
    ja renderizada. Serve para o exercicio do item 45 do roadmap: carregar as regras, disparar
    um alerta sintetico e comprovar a entrega no canal (Mailpit local).

    Em producao, os mesmos artefatos sao usados com SMTP institucional e enderecos reais.

.PARAMETER MetricsScrapeToken
    Token de coleta do backend (Authorization: Bearer). Deve ser o mesmo do container backend.

.PARAMETER Network
    Rede Docker do Compose local (padrao manganetworking_default).

.PARAMETER RenderedAlertmanagerConfig
    Configuracao do Alertmanager ja renderizada (padrao ops/alertmanager/alertmanager.rendered.yml).

.EXAMPLE
    .\ops\alertmanager\start-local-alerting.ps1 -MetricsScrapeToken 'token-de-teste-local-32-chars-min'
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $MetricsScrapeToken,

    [string] $Network = 'manganetworking_default',

    [string] $RenderedAlertmanagerConfig,

    [string] $PrometheusContainer = 'manganetworking-prometheus',

    [string] $AlertmanagerContainer = 'manganetworking-alertmanager'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not $RenderedAlertmanagerConfig) {
    $RenderedAlertmanagerConfig = Join-Path $repoRoot 'ops\alertmanager\alertmanager.rendered.yml'
}
if (-not (Test-Path -LiteralPath $RenderedAlertmanagerConfig)) {
    throw "Configuracao renderizada nao encontrada: $RenderedAlertmanagerConfig. Rode antes: apply-alert-rules.ps1"
}

$tokenDirectory = Join-Path $env:TEMP 'mn-prom-token'
if (-not (Test-Path -LiteralPath $tokenDirectory)) {
    New-Item -ItemType Directory -Path $tokenDirectory -Force | Out-Null
}
$tokenFile = Join-Path $tokenDirectory 'metrics-scrape-token'
[IO.File]::WriteAllText($tokenFile, $MetricsScrapeToken, (New-Object System.Text.UTF8Encoding($false)))

docker rm -f $PrometheusContainer $AlertmanagerContainer 2>$null | Out-Null

docker run -d --name $AlertmanagerContainer --network $Network `
    -p 9093:9093 `
    -v "${RenderedAlertmanagerConfig}:/etc/alertmanager/alertmanager.yml:ro" `
    prom/alertmanager:latest `
    --config.file=/etc/alertmanager/alertmanager.yml `
    --storage.path=/alertmanager | Out-Null

docker run -d --name $PrometheusContainer --network $Network `
    -p 9090:9090 `
    -v "${repoRoot}\ops\prometheus\prometheus.yml:/etc/prometheus/prometheus.yml:ro" `
    -v "${repoRoot}\ops\prometheus\manganetworking-alerts.yml:/etc/prometheus/manganetworking-alerts.yml:ro" `
    -v "${tokenFile}:/etc/prometheus/metrics-scrape-token:ro" `
    prom/prometheus:latest `
    --config.file=/etc/prometheus/prometheus.yml `
    --storage.tsdb.path=/prometheus | Out-Null

Write-Output 'Prometheus: http://localhost:9090 | Alertmanager: http://localhost:9093'
Write-Output 'Aguarde os containers ficarem healthy antes de rodar apply-alert-rules.ps1.'
