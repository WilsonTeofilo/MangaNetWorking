<#
.SYNOPSIS
    Publicacao controlada do texto oficial da Politica de Privacidade.

.DESCRIPTION
    Executa o procedimento controlado de publicacao do item 48 do roadmap:
    1. valida o documento aprovado (front matter completo, versao coerente, sem material sensivel);
    2. calcula o SHA-256 do arquivo;
    3. instala o documento no diretorio de publicacao (repositorio ou diretorio de runtime fora do Git);
    4. registra a publicacao em log append-only (ops/legal/publication-log.jsonl);
    5. imprime o comando de verificacao do endpoint publico.

    O script NAO substitui a aprovacao legal: ele apenas publica um texto que ja tem
    aprovacao declarada no front matter (approvedBy/approvalReference). Sem esses campos,
    nada e publicado.

.PARAMETER DocumentPath
    Caminho do documento aprovado (Markdown com front matter).

.PARAMETER Version
    Versao da politica. Precisa coincidir com a versao exigida no aceite (PRIVACY_POLICY_VERSION).

.PARAMETER EffectiveDate
    Data de vigencia no formato AAAA-MM-DD.

.PARAMETER ApprovedBy
    Autoridade que aprovou o texto (nome do encarregado/juridico/orgao).

.PARAMETER ApprovalReference
    Identificador da aprovacao (ata, contrato, e-mail corporativo).

.PARAMETER TargetDirectory
    Diretorio de instalacao. Padrao: backend/src/main/resources/legal/privacy-policy.
    Sem este parametro e sem -RuntimeDirectory, o documento e instalado no repositorio.

.PARAMETER RuntimeDirectory
    Diretorio de runtime fora do Git. Quando informado, o documento e instalado aqui e o
    backend deve apontar PRIVACY_POLICY_DOCUMENT para o arquivo instalado.

.PARAMETER ReplaceExisting
    Permite substituir um documento ja publicado da mesma versao (mantem o historico no log).

.EXAMPLE
    .\ops\legal\publish-privacy-policy.ps1 -DocumentPath .\politica-aprovada.md -Version 2026-10-v1 -EffectiveDate 2026-10-01 -ApprovedBy 'Encarregado de Dados' -ApprovalReference 'ATA-2026-001'
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $DocumentPath,

    [Parameter(Mandatory = $true)]
    [string] $Version,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string] $EffectiveDate,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ApprovedBy,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ApprovalReference,

    [string] $TargetDirectory,

    [string] $RuntimeDirectory,

    [switch] $ReplaceExisting
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

if (-not (Test-Path -LiteralPath $DocumentPath -PathType Leaf)) {
    throw "Documento nao encontrado: $DocumentPath"
}

$resolvedDocument = (Resolve-Path -LiteralPath $DocumentPath).Path
$content = Get-Content -LiteralPath $resolvedDocument -Raw -Encoding UTF8
if ([string]::IsNullOrWhiteSpace($content)) {
    throw 'Documento vazio: nada sera publicado.'
}

$normalized = $content -replace "`r`n", "`n"
if ($normalized.StartsWith([char]0xFEFF)) { $normalized = $normalized.Substring(1) }
if (-not $normalized.StartsWith("---`n")) {
    throw 'Front matter ausente. O documento precisa comecar com "---" e declarar version, effectiveDate, approvedBy e approvalReference.'
}

$frontMatterEnd = $normalized.IndexOf("`n---", 3)
if ($frontMatterEnd -lt 0) {
    throw 'Front matter nao fechado (falta "---").'
}

$fields = @{}
foreach ($line in $normalized.Substring(4, $frontMatterEnd - 4) -split "`n") {
    if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) { continue }
    $separator = $line.IndexOf(':')
    if ($separator -le 0) { continue }
    $fields[$line.Substring(0, $separator).Trim().ToLowerInvariant()] = $line.Substring($separator + 1).Trim()
}

foreach ($required in @('version', 'effectivedate', 'approvedby', 'approvalreference')) {
    if (-not $fields.ContainsKey($required) -or [string]::IsNullOrWhiteSpace($fields[$required])) {
        throw "Front matter sem o campo obrigatorio '$required'. Nada sera publicado."
    }
}

if ($fields['version'] -ne $Version) {
    throw "Versao do front matter ('$($fields['version'])') difere da versao informada ('$Version')."
}
if ($fields['effectivedate'] -ne $EffectiveDate) {
    throw "Data de vigencia do front matter ('$($fields['effectivedate'])') difere de '$EffectiveDate'."
}
if ($fields['approvedby'] -ne $ApprovedBy) {
    throw "approvedBy do front matter ('$($fields['approvedby'])') difere de '$ApprovedBy'."
}
if ($fields['approvalreference'] -ne $ApprovalReference) {
    throw "approvalReference do front matter ('$($fields['approvalreference'])') difere de '$ApprovalReference'."
}

$body = $normalized.Substring($normalized.IndexOf("`n", $frontMatterEnd + 1) + 1).Trim()
if ($body.Length -lt 400) {
    throw "Conteudo com apenas $($body.Length) caracteres. Texto oficial muito curto para publicacao."
}

$forbidden = @(
    '-----BEGIN [A-Z ]*PRIVATE KEY-----',
    'sk_live_[A-Za-z0-9]+',
    'AKIA[0-9A-Z]{16}',
    '(?i)\b(password|senha|secret|senha_do_banco)\s*[:=]\s*\S+'
)
foreach ($pattern in $forbidden) {
    if ($body -match $pattern) {
        throw "O documento contem material sensivel (padrao '$pattern'). Nada sera publicado."
    }
}

$hash = (Get-FileHash -LiteralPath $resolvedDocument -Algorithm SHA256).Hash.ToLowerInvariant()

function Install-Document {
    param([string] $Directory)
    if ([string]::IsNullOrWhiteSpace($Directory)) { return $null }
    if (-not (Test-Path -LiteralPath $Directory)) {
        New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    }
    $target = Join-Path $Directory "$Version.md"
    if ((Test-Path -LiteralPath $target) -and (-not $ReplaceExisting)) {
        $existingHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($existingHash -ne $hash) {
            throw "Ja existe um documento publicado da versao $Version com outro conteudo. Use -ReplaceExisting para substituir (o historico fica no log)."
        }
    }
    Copy-Item -LiteralPath $resolvedDocument -Destination $target -Force
    # Reescreve sem BOM: o backend le o front matter e um BOM quebraria a deteccao.
    $text = Get-Content -LiteralPath $target -Raw -Encoding UTF8
    [IO.File]::WriteAllText($target, $text, (New-Object System.Text.UTF8Encoding($false)))
    return $target
}

$repoDirectory = $null
if ($TargetDirectory) {
    $repoDirectory = $TargetDirectory
} elseif (-not $RuntimeDirectory) {
    $repoDirectory = Join-Path $repoRoot 'backend\src\main\resources\legal\privacy-policy'
}
$installed = $null
if ($repoDirectory) {
    $installed = Install-Document -Directory $repoDirectory
}
$runtimeInstalled = $null
if ($RuntimeDirectory) {
    $runtimeInstalled = Install-Document -Directory $RuntimeDirectory
}

$logPath = Join-Path $repoRoot 'ops\legal\publication-log.jsonl'
$logDirectory = Split-Path -Parent $logPath
if (-not (Test-Path -LiteralPath $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
}
$record = [ordered]@{
    publishedAtUtc = [DateTime]::UtcNow.ToString('o')
    version = $Version
    effectiveDate = $EffectiveDate
    approvedBy = $ApprovedBy
    approvalReference = $ApprovalReference
    sha256 = $hash
    sourceFile = $resolvedDocument
    installedPath = $installed
    runtimePath = $runtimeInstalled
    publishedBy = [Environment]::UserName
}
$record | ConvertTo-Json -Compress | Add-Content -LiteralPath $logPath -Encoding UTF8

Write-Output "Politica publicada: versao $Version | sha256 $hash"
if ($installed) { Write-Output "Instalado em: $installed" }
if ($runtimeInstalled) { Write-Output "Copiado para runtime: $runtimeInstalled" }
Write-Output "Registro de publicacao: $logPath"
Write-Output "Verificacao: curl -s http://localhost:8085/api/legal/privacy-policy"
if ($runtimeInstalled) {
    Write-Output 'Para usar o arquivo de runtime, reinicie o backend com PRIVACY_POLICY_DOCUMENT apontando para o caminho instalado.'
}
