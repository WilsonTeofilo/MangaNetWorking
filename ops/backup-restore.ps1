param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Backup', 'RestoreCheck')]
    [string] $Mode,

    [Parameter(Mandatory = $true)]
    [string] $BackupPath,

    [string] $ComposeFile = 'docker-compose.yml',

    # Chave de cifra do backup (fora do Git). Ativa a geracao do artefato cifrado *.mnbak.
    [string] $EncryptKeyFile,

    # Destino off-site (segundo volume, bucket montado ou caminho de rede). Recebe o artefato cifrado.
    [string] $OffsiteDestination,

    # Politica de retencao: remove backups com mais de N dias dentro de RetentionRoot.
    [int] $RetentionDays = 0,

    [string] $RetentionRoot,

    # Remove a copia em claro depois que o artefato cifrado foi verificado.
    [switch] $RemovePlaintext,

    # Artefato cifrado a verificar (RestoreCheck) - opcional; usa BackupPath se omitido.
    [string] $EncryptedArtifact
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composePath = if ([IO.Path]::IsPathRooted($ComposeFile)) { $ComposeFile } else { Join-Path $repoRoot $ComposeFile }
$composePath = (Resolve-Path -LiteralPath $composePath).Path
$compose = @('compose', '--project-directory', $repoRoot, '-f', $composePath)
$mongoAuthenticationEnabled = [IO.Path]::GetFileName($composePath) -eq 'docker-compose.prod.yml'

function Invoke-Compose {
    param([string[]] $Arguments)
    & docker @compose @Arguments
    if ($LASTEXITCODE -ne 0) { throw "docker compose falhou (exit $LASTEXITCODE): $($Arguments -join ' ')" }
}

function Assert-BackupFile {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "Arquivo de backup ausente: $Path" }
    if ((Get-Item -LiteralPath $Path).Length -eq 0) { throw "Arquivo de backup vazio: $Path" }
}

# ---------------------------------------------------------------------------------------------
# Cifra, destino off-site e retencao (item 42 do roadmap)
# ---------------------------------------------------------------------------------------------
$cryptoModule = Join-Path $PSScriptRoot 'crypto\backup-crypto.psm1'

function Protect-BackupArtifact {
    <#
        Gera o artefato cifrado e prova a integridade: decifra em area temporaria e confere
        os checksums do manifesto antes de devolver.
    #>
    param(
        [string] $BackupDirectory,
        [string] $KeyFile
    )

    Import-Module $cryptoModule -Force -DisableNameChecking
    $artifact = Protect-BackupPath -Path $BackupDirectory -KeyFile $KeyFile

    $verificationRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('mn-backup-verify-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    try {
        Unprotect-BackupPath -Artifact $artifact.artifact -KeyFile $KeyFile -Destination $verificationRoot | Out-Null
        $manifestPath = Join-Path $verificationRoot 'manifest.json'
        if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Artefato decifrado nao contem manifest.json.' }
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        foreach ($entry in $manifest.files) {
            $file = Join-Path $verificationRoot $entry.path
            if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Arquivo ausente no artefato decifrado: $($entry.path)" }
            if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Checksum divergente no artefato decifrado: $($entry.path)" }
        }
    } finally {
        Remove-Item -LiteralPath $verificationRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    return $artifact
}

function Copy-ArtifactOffsite {
    param(
        [string] $Artifact,
        [string] $Destination
    )

    $resolvedDestination = [System.IO.Path]::GetFullPath($Destination)
    if (-not (Test-Path -LiteralPath $resolvedDestination)) {
        New-Item -ItemType Directory -Path $resolvedDestination -Force | Out-Null
    }
    $target = Join-Path $resolvedDestination (Split-Path -Leaf $Artifact)
    if (Test-Path -LiteralPath $target) { throw "Ja existe um artefato off-site com esse nome: $target" }
    Copy-Item -LiteralPath $Artifact -Destination $target

    $sourceHash = (Get-FileHash -LiteralPath $Artifact -Algorithm SHA256).Hash.ToLowerInvariant()
    $targetHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($sourceHash -ne $targetHash) { throw 'Copia off-site divergente do original (checksum nao confere).' }

    $copyLog = Join-Path $resolvedDestination 'offsite-copies.jsonl'
    ([ordered]@{
            copiedAtUtc = [DateTime]::UtcNow.ToString('o')
            artifact = (Split-Path -Leaf $Artifact)
            sha256 = $targetHash
            bytes = (Get-Item -LiteralPath $target).Length
            copiedBy = [Environment]::UserName
        } | ConvertTo-Json -Compress) | Add-Content -LiteralPath $copyLog -Encoding UTF8

    return @{ path = $target; sha256 = $targetHash }
}

function Invoke-BackupRetention {
    <#
        Remove backups mais antigos que a janela de retencao dentro de RetentionRoot.
        Nunca remove o backup mais recente e nunca sai do diretorio informado.
    #>
    param(
        [string] $Root,
        [int] $Days
    )

    if ([string]::IsNullOrWhiteSpace($Root)) { throw 'A retencao exige -RetentionRoot (diretorio com os backups).' }
    $resolvedRoot = [System.IO.Path]::GetFullPath($Root)
    if (-not (Test-Path -LiteralPath $resolvedRoot -PathType Container)) { throw "Diretorio de retencao ausente: $resolvedRoot" }

    $candidates = Get-ChildItem -LiteralPath $resolvedRoot -Directory -ErrorAction SilentlyContinue
    if (-not $candidates -or $candidates.Count -eq 0) { return @() }

    $dated = $candidates | ForEach-Object {
        $manifest = Join-Path $_.FullName 'manifest.json'
        $created = if (Test-Path -LiteralPath $manifest -PathType Leaf) {
            [DateTime]::Parse((Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json).createdAtUtc)
        } else {
            $_.CreationTimeUtc
        }
        [PSCustomObject]@{ Directory = $_; Created = $created }
    } | Sort-Object Created -Descending

    $keep = $dated | Select-Object -First 1
    $limit = (Get-Date).ToUniversalTime().AddDays(-$Days)
    $removed = @()
    foreach ($entry in ($dated | Select-Object -Skip 1)) {
        if ($entry.Created -gt $limit) { continue }
        $target = $entry.Directory.FullName
        if (-not $target.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusando remover caminho fora da raiz de retencao: $target"
        }
        Remove-Item -LiteralPath $target -Recurse -Force
        $removed += $target
    }

    $pruneLog = Join-Path $resolvedRoot 'retention-prune.jsonl'
    if ($removed.Count -gt 0) {
        ([ordered]@{
                prunedAtUtc = [DateTime]::UtcNow.ToString('o')
                retentionDays = $Days
                keptNewest = $keep.Directory.FullName
                removed = $removed
            } | ConvertTo-Json -Compress -Depth 4) | Add-Content -LiteralPath $pruneLog -Encoding UTF8
    }

    return $removed
}

$resolvedBackupPath = [IO.Path]::GetFullPath($BackupPath)
$runId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '_' + [guid]::NewGuid().ToString('N').Substring(0, 8)

if ($Mode -eq 'Backup') {
    if (Test-Path -LiteralPath $resolvedBackupPath) { throw 'Destino já existe; backups não são sobrescritos.' }
    New-Item -ItemType Directory -Path $resolvedBackupPath | Out-Null
    $pgTemp = "/tmp/mn-$runId.dump"
    $mongoTemp = "/tmp/mn-$runId.archive.gz"
    try {
        Invoke-Compose @('exec', '-T', 'postgres', 'sh', '-lc', "pg_dump -Fc -U `$POSTGRES_USER -d `$POSTGRES_DB -f '$pgTemp'")
        Invoke-Compose @('cp', "postgres:$pgTemp", (Join-Path $resolvedBackupPath 'postgres.dump'))
        if ($mongoAuthenticationEnabled) {
            Invoke-Compose @('exec', '-T', 'mongodb', 'sh', '-lc', "mongodump --username `$MONGO_INITDB_ROOT_USERNAME --password `$MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase admin --db manganetworking_events --archive='$mongoTemp' --gzip")
        } else {
            Invoke-Compose @('exec', '-T', 'mongodb', 'mongodump', '--db', 'manganetworking_events', "--archive=$mongoTemp", '--gzip')
        }
        Invoke-Compose @('cp', "mongodb:$mongoTemp", (Join-Path $resolvedBackupPath 'mongo.archive.gz'))
        Invoke-Compose @('cp', 'backend:/data/uploads', (Join-Path $resolvedBackupPath 'storage'))
        Assert-BackupFile (Join-Path $resolvedBackupPath 'postgres.dump')
        Assert-BackupFile (Join-Path $resolvedBackupPath 'mongo.archive.gz')
        $storagePath = Join-Path $resolvedBackupPath 'storage'
        if (-not (Test-Path -LiteralPath $storagePath -PathType Container)) { throw 'Cópia do storage não foi criada.' }
        $files = Get-ChildItem -LiteralPath $resolvedBackupPath -File -Recurse
        $manifest = [ordered]@{
            createdAtUtc = [DateTime]::UtcNow.ToString('o')
            composeFile = [IO.Path]::GetFileName($composePath)
            files = @($files | ForEach-Object {
                # Windows PowerShell 5.1 não tem [IO.Path]::GetRelativePath.
                $relative = $_.FullName.Substring($resolvedBackupPath.Length).TrimStart('\', '/')
                [ordered]@{ path = $relative; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
            })
        }
        $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $resolvedBackupPath 'manifest.json') -Encoding utf8
        Write-Output "Backup completo: $resolvedBackupPath"

        if ($EncryptKeyFile) {
            $artifact = Protect-BackupArtifact -BackupDirectory $resolvedBackupPath -KeyFile $EncryptKeyFile
            Write-Output "Artefato cifrado: $($artifact.artifact) ($($artifact.bytes) bytes, sha256 $($artifact.sha256))"
            Write-Output 'Cifra verificada: o artefato foi decifrado em area temporaria e os checksums do manifesto conferem.'

            if ($OffsiteDestination) {
                $copy = Copy-ArtifactOffsite -Artifact $artifact.artifact -Destination $OffsiteDestination
                Write-Output "Copia off-site verificada: $($copy.path) (sha256 $($copy.sha256))"
            }

            if ($RemovePlaintext) {
                Remove-Item -LiteralPath $resolvedBackupPath -Recurse -Force
                Write-Output 'Copia em claro removida; resta apenas o artefato cifrado.'
            } else {
                Write-Output 'ATENCAO: a copia em claro permanece no disco. Remova-a ou mantenha o volume cifrado.'
            }
        } elseif ($OffsiteDestination) {
            throw 'O destino off-site exige um artefato cifrado: informe -EncryptKeyFile.'
        }

        if ($RetentionDays -gt 0) {
            $pruned = Invoke-BackupRetention -Root $RetentionRoot -Days $RetentionDays
            Write-Output "Retencao aplicada: $($pruned.Count) backup(s) removido(s) com mais de $RetentionDays dia(s)."
        }
    } finally {
        & docker @compose exec -T postgres rm -f $pgTemp 2>$null
        & docker @compose exec -T mongodb rm -f $mongoTemp 2>$null
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $resolvedBackupPath -PathType Container)) { throw 'Diretório do backup não encontrado.' }
$decryptedRoot = $null
if ($EncryptedArtifact) {
    if (-not $EncryptKeyFile) { throw 'A verificacao de artefato cifrado exige -EncryptKeyFile.' }
    Import-Module $cryptoModule -Force -DisableNameChecking
    $decryptedRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('mn-restore-check-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    Unprotect-BackupPath -Artifact $EncryptedArtifact -KeyFile $EncryptKeyFile -Destination $decryptedRoot | Out-Null
    Write-Output "Artefato cifrado decifrado para verificacao: $decryptedRoot"
    $resolvedBackupPath = $decryptedRoot
}

$pgDump = Join-Path $resolvedBackupPath 'postgres.dump'
$mongoDump = Join-Path $resolvedBackupPath 'mongo.archive.gz'
Assert-BackupFile $pgDump
Assert-BackupFile $mongoDump
$manifestPath = Join-Path $resolvedBackupPath 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'manifest.json ausente.' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
foreach ($entry in $manifest.files) {
    $file = Join-Path $resolvedBackupPath $entry.path
    Assert-BackupFile $file
    if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Checksum inválido: $($entry.path)" }
}

$stagingDb = "mn_restore_check_$($runId.Replace('-', '_'))"
$mongoStagingDb = $stagingDb
$containerPgDump = "/tmp/$stagingDb.dump"
$containerMongoDump = "/tmp/$stagingDb.archive.gz"
$storageStage = Join-Path $resolvedBackupPath "restore-check-$runId"
New-Item -ItemType Directory -Path $storageStage | Out-Null
try {
    Invoke-Compose @('cp', $pgDump, "postgres:$containerPgDump")
    Invoke-Compose @('exec', '-T', 'postgres', 'sh', '-lc', "createdb -U `$POSTGRES_USER '$stagingDb' && pg_restore -U `$POSTGRES_USER -d '$stagingDb' '$containerPgDump'")
    Invoke-Compose @('cp', $mongoDump, "mongodb:$containerMongoDump")
    if ($mongoAuthenticationEnabled) {
        Invoke-Compose @('exec', '-T', 'mongodb', 'sh', '-lc', "mongorestore --username `$MONGO_INITDB_ROOT_USERNAME --password `$MONGO_INITDB_ROOT_PASSWORD --authenticationDatabase admin --archive='$containerMongoDump' --gzip --nsFrom='manganetworking_events.*' --nsTo='$mongoStagingDb.*'")
    } else {
        Invoke-Compose @('exec', '-T', 'mongodb', 'mongorestore', "--archive=$containerMongoDump", '--gzip', "--nsFrom=manganetworking_events.*", "--nsTo=$mongoStagingDb.*")
    }
    $storageSource = Join-Path $resolvedBackupPath 'storage'
    if (Test-Path -LiteralPath $storageSource -PathType Container) {
        Copy-Item -LiteralPath $storageSource -Destination (Join-Path $storageStage 'storage') -Recurse
    }
    Write-Output "Restauração de verificação concluída em banco isolado '$stagingDb'; Mongo '$mongoStagingDb'; storage copiado para '$storageStage'. Nada foi restaurado sobre os bancos/uploads ativos."
} finally {
    & docker @compose exec -T postgres rm -f $containerPgDump 2>$null
    & docker @compose exec -T mongodb rm -f $containerMongoDump 2>$null
    if ($decryptedRoot) { Remove-Item -LiteralPath $decryptedRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
