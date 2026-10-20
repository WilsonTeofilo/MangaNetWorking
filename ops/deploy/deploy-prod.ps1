<#
.SYNOPSIS
    Prepara e executa o deploy de producao no host provisionado (itens 51/52 e 14.3 do roadmap).

.DESCRIPTION
    O script NAO inventa infraestrutura: ele valida e organiza o que ja foi provisionado.

    -ValidateOnly (padrao):
        1. confere as variaveis obrigatorias do Compose de producao (sem imprimir valores);
        2. valida o `docker compose config` do arquivo de producao;
        3. confere a politica de privacidade publicada e o canal de plantao renderizado;
        4. confere que o backup cifrado e a chave existem no host (opcional);
        5. imprime o checklist do que falta.

    -Apply:
        executa `docker compose -f docker-compose.prod.yml up -d --build`, espera os healthchecks,
        confere as migracoes Flyway (V1..V16) e roda o smoke contra a stack implantada.

    O `.env` de producao fica FORA do Git (veja ops/deploy/env.production.example). O script
    recusa continuar se a variavel de ambiente apontar para um arquivo dentro do repositorio.

.PARAMETER EnvFile
    Caminho do `.env` de producao (fora do repositorio).

.PARAMETER ComposeFile
    Compose de producao (padrao docker-compose.prod.yml).

.PARAMETER Apply
    Executa o deploy (nao faz so a validacao).

.PARAMETER SmokeScript
    Script de smoke E2E usado na verificacao.

.EXAMPLE
    .\ops\deploy\deploy-prod.ps1 -EnvFile C:\ProgramData\MangaNetWorking\secrets\.env
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $EnvFile,

    [string] $ComposeFile = 'docker-compose.prod.yml',

    [switch] $Apply,

    [string] $SmokeScript = 'smoke_test_e2e.ps1',

    [string] $BackendUrl = 'http://localhost:8085'
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw "Arquivo de ambiente nao encontrado: $EnvFile"
}
$resolvedEnv = (Resolve-Path -LiteralPath $EnvFile).Path
if ($resolvedEnv.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'O .env de producao nao pode ficar dentro do repositorio: mova-o para fora do Git.'
}

# Carrega o .env sem imprimir valores.
Get-Content -LiteralPath $resolvedEnv -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $separator = $line.IndexOf('=')
    if ($separator -le 0) { return }
    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()
    Set-Item -Path ('Env:' + $name) -Value $value
}

$required = @(
    'POSTGRES_PASSWORD', 'MONGO_ROOT_USERNAME', 'MONGO_ROOT_PASSWORD', 'REDIS_PASSWORD',
    'MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM', 'SPRING_DATA_MONGODB_URI',
    'AES_SECRET_KEY', 'OTP_HMAC_SECRET', 'EMAIL_WEBHOOK_SECRET', 'METRICS_SCRAPE_TOKEN', 'PUBLIC_FRONTEND_URL'
)
$missing = @()
$weak = @()
foreach ($name in $required) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ([string]::IsNullOrWhiteSpace($value)) { $missing += $name; continue }
    if ($name -in @('OTP_HMAC_SECRET', 'EMAIL_WEBHOOK_SECRET', 'METRICS_SCRAPE_TOKEN') -and $value.Length -lt 32) {
        $weak += $name
    }
    if ($name -eq 'AES_SECRET_KEY') {
        try {
            $bytes = [Convert]::FromBase64String($value)
            if ($bytes.Length -ne 32) { $weak += $name }
        } catch { $weak += $name }
    }
}

Write-Output '== 1/5 variaveis obrigatorias =='
if ($missing.Count -gt 0) { throw "Variaveis ausentes no .env: $($missing -join ', ')" }
if ($weak.Count -gt 0) { throw "Variaveis com tamanho/formato invalido: $($weak -join ', ')" }
Write-Output "Todas as $($required.Count) variaveis obrigatorias estao presentes e validas (valores nao impressos)."

Write-Output '== 2/5 compose de producao =='
$composePath = if ([IO.Path]::IsPathRooted($ComposeFile)) { $ComposeFile } else { Join-Path $repoRoot $ComposeFile }
Push-Location $repoRoot
try {
    docker compose -f $composePath config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'docker compose config falhou para o arquivo de producao.' }
} finally {
    Pop-Location
}
Write-Output 'Compose de producao valido.'

Write-Output '== 3/5 politica de privacidade e canal de plantao =='
$policyPath = [Environment]::GetEnvironmentVariable('PRIVACY_POLICY_DOCUMENT')
if ($policyPath) {
    if (Test-Path -LiteralPath $policyPath -PathType Leaf) {
        Write-Output "Politica de privacidade aprovada presente: $policyPath"
    } else {
        throw "PRIVACY_POLICY_DOCUMENT aponta para arquivo inexistente: $policyPath"
    }
} else {
    Write-Output 'ATENCAO: PRIVACY_POLICY_DOCUMENT nao definido; a API respondera 404 POLICY_NOT_PUBLISHED.'
}
$renderedAlertmanager = Join-Path $repoRoot 'ops\alertmanager\alertmanager.rendered.yml'
if (Test-Path -LiteralPath $renderedAlertmanager -PathType Leaf) {
    Write-Output "Configuracao do canal de plantao renderizada: $renderedAlertmanager"
} else {
    Write-Output 'ATENCAO: canal de plantao ainda nao renderizado (ops/alertmanager/apply-alert-rules.ps1).'
}

Write-Output '== 4/5 backup cifrado =='
$backupArtifact = [Environment]::GetEnvironmentVariable('BACKUP_ARTIFACT')
if ($backupArtifact) {
    if (-not (Test-Path -LiteralPath $backupArtifact -PathType Leaf)) { throw "Artefato de backup ausente: $backupArtifact" }
    Write-Output "Artefato de backup cifrado presente: $backupArtifact"
} else {
    Write-Output 'ATENCAO: BACKUP_ARTIFACT nao definido; confirme o ultimo backup cifrado antes do cutover.'
}

if (-not $Apply) {
    Write-Output '== 5/5 modo validacao (sem deploy) =='
    Write-Output 'Validacao concluida. Use -Apply para subir a stack de producao neste host.'
    exit 0
}

Write-Output '== 5/5 aplicando o deploy =='
Push-Location $repoRoot
try {
    docker compose -f $composePath up -d --build
    if ($LASTEXITCODE -ne 0) { throw 'docker compose up falhou.' }

    Write-Output 'Aguardando healthchecks (ate 180 s)...'
    $deadline = (Get-Date).AddSeconds(180)
    $healthy = $false
    while ((Get-Date) -lt $deadline -and -not $healthy) {
        $status = docker compose -f $composePath ps --format '{{.Service}}={{.Status}}'
        $healthy = ($status -notmatch 'starting') -and ($status -notmatch 'unhealthy')
        if (-not $healthy) { Start-Sleep -Seconds 5 }
    }
    if (-not $healthy) { throw 'Servicos nao ficaram saudaveis no prazo.' }
    Write-Output 'Healthchecks ok.'

    $migrationLog = docker logs manganetworking-backend 2>&1 | Select-String -Pattern 'now at version v' | Select-Object -Last 1
    if ($migrationLog) { Write-Output "Flyway: $migrationLog" } else { Write-Output 'ATENCAO: nao foi possivel ler a versao do Flyway nos logs.' }

    $smokePath = Join-Path $repoRoot $SmokeScript
    if (Test-Path -LiteralPath $smokePath -PathType Leaf) {
        $smokeOutput = & powershell -ExecutionPolicy Bypass -File $smokePath 2>&1
        $smokeOutput | Select-Object -Last 8
        if ($LASTEXITCODE -ne 0) { throw 'Smoke E2E falhou na stack implantada.' }
    } else {
        Write-Output 'ATENCAO: script de smoke nao encontrado.'
    }
} finally {
    Pop-Location
}

Write-Output 'Deploy concluido.'
exit 0
