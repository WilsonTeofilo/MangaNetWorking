param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Backup', 'RestoreCheck')]
    [string] $Mode,

    [Parameter(Mandatory = $true)]
    [string] $BackupPath,

    [string] $ComposeFile = 'docker-compose.yml'
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
    } finally {
        & docker @compose exec -T postgres rm -f $pgTemp 2>$null
        & docker @compose exec -T mongodb rm -f $mongoTemp 2>$null
    }
    exit 0
}

if (-not (Test-Path -LiteralPath $resolvedBackupPath -PathType Container)) { throw 'Diretório do backup não encontrado.' }
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
}
