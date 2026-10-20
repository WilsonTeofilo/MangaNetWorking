<#
.SYNOPSIS
    Cifra e decifra backups do MangaNetWorking (AES-256-CBC + HMAC-SHA256, encrypt-then-MAC).

.DESCRIPTION
    O destino off-site e a retencao exigem backup cifrado em repouso. Como o host pode nao ter
    age/gpg instalados, a cifra e feita com primitives do .NET, sem dependencia externa:

      - derivacao de chaves: PBKDF2-HMAC-SHA256 (200.000 iteracoes) a partir da senha do arquivo
        de chave, com sal aleatorio por backup (ou chaves cruas em base64 com 64 bytes);
      - confidentiality: AES-256-CBC com IV aleatorio por arquivo;
      - integrity: HMAC-SHA256 sobre o cabecalho + ciphertext (encrypt-then-MAC);
      - formato do artefato: texto com cabecalho e payload base64 (*.mnbak).

    O arquivo de chave NUNCA e versionado: em producao ele fica sob custodia de KMS/gerenciador
    de segredos, conforme docs/ops/RETENCAO-CIFRA-OFFSITE.md.

.EXAMPLE
    Import-Module .\ops\crypto\backup-crypto.psm1
    Protect-BackupPath -Path C:\backups\run-2026-10-20 -KeyFile C:\segredos\backup.key
    Unprotect-BackupPath -Artifact C:\backups\run-2026-10-20.zip.mnbak -KeyFile C:\segredos\backup.key -Destination C:\restaurado
#>

Set-StrictMode -Version Latest

$script:Iterations = 200000
$script:Magic = 'MNBACKUP1'

function Get-BackupKeyMaterial {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $KeyFile
    )

    if (-not (Test-Path -LiteralPath $KeyFile -PathType Leaf)) {
        throw "Arquivo de chave nao encontrado: $KeyFile"
    }
    $raw = (Get-Content -LiteralPath $KeyFile -Raw -Encoding UTF8).Trim()
    if ($raw.Length -eq 0) {
        throw 'Arquivo de chave vazio.'
    }

    $salt = New-Object byte[] 16
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)

    try {
        $rawBytes = [Convert]::FromBase64String($raw)
    } catch {
        $rawBytes = $null
    }

    if ($rawBytes -and $rawBytes.Length -eq 64) {
        $aesKey = $rawBytes[0..31]
        $hmacKey = $rawBytes[32..63]
    } else {
        $derive = New-Object System.Security.Cryptography.Rfc2898DeriveBytes(
            $raw, $salt, $script:Iterations, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
        $material = $derive.GetBytes(64)
        $aesKey = $material[0..31]
        $hmacKey = $material[32..63]
    }

    return @{
        salt = $salt
        aesKey = $aesKey
        hmacKey = $hmacKey
        iterations = $script:Iterations
    }
}

function Test-BackupMac {
    <#
        Comparacao em tempo constante (o .NET Framework nao expoe CryptographicOperations).
        Evita que a verificacao de integridade vaze informacao por tempo de resposta.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [byte[]] $Computed,

        [Parameter(Mandatory = $true)]
        [byte[]] $Expected
    )

    if ($Computed.Length -ne $Expected.Length) { return $false }
    $diff = 0
    for ($index = 0; $index -lt $Computed.Length; $index++) {
        $diff = $diff -bor ($Computed[$index] -bxor $Expected[$index])
    }
    return $diff -eq 0
}

function Protect-BackupPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $KeyFile,

        [string] $ArtifactPath
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        throw "Diretorio de backup ausente: $Path"
    }

    $key = Get-BackupKeyMaterial -KeyFile $KeyFile
    $iv = New-Object byte[] 16
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($iv)

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.Key = $key.aesKey
    $aes.IV = $iv
    $encryptor = $aes.CreateEncryptor()

    $zipPath = if ($ArtifactPath) { $ArtifactPath -replace '\.mnbak$', '.zip' } else { "$Path.zip" }
    if (Test-Path -LiteralPath $zipPath) { throw "Artefato ja existe: $zipPath" }
    Compress-Archive -Path (Join-Path $Path '*') -DestinationPath $zipPath -Force

    $plain = [System.IO.File]::ReadAllBytes($zipPath)
    $cipher = $encryptor.TransformFinalBlock($plain, 0, $plain.Length)
    $encryptor.Dispose()
    $aes.Dispose()

    $header = @(
        $script:Magic
        'alg=A256CBC-HS256'
        ('kdf={0}' -f $(if ($key.iterations -gt 0) { "PBKDF2-SHA256-$($key.iterations)" } else { 'RAW' }))
        ('salt={0}' -f [Convert]::ToBase64String($key.salt))
        ('iv={0}' -f [Convert]::ToBase64String($iv))
    )
    $headerText = ($header -join "`n")

    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $key.hmacKey
    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerText + "`n")
    $mac = $hmac.ComputeHash($headerBytes + $cipher)

    $outputPath = if ($ArtifactPath) { $ArtifactPath } else { "$Path.zip.mnbak" }
    $outputText = $headerText + "`n" +
        ('mac={0}' -f [Convert]::ToBase64String($mac)) + "`n" +
        ('payload={0}' -f [Convert]::ToBase64String($cipher))
    [System.IO.File]::WriteAllText($outputPath, $outputText, (New-Object System.Text.UTF8Encoding($false)))
    Remove-Item -LiteralPath $zipPath -Force

    return @{
        artifact = $outputPath
        sha256 = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant()
        bytes = (Get-Item -LiteralPath $outputPath).Length
    }
}

function Unprotect-BackupPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Artifact,

        [Parameter(Mandatory = $true)]
        [string] $KeyFile,

        [Parameter(Mandatory = $true)]
        [string] $Destination
    )

    if (-not (Test-Path -LiteralPath $Artifact -PathType Leaf)) {
        throw "Artefato cifrado ausente: $Artifact"
    }
    $lines = Get-Content -LiteralPath $Artifact -Encoding UTF8
    if ($lines.Count -lt 4 -or $lines[0] -ne $script:Magic) {
        throw "Artefato nao e um backup cifrado valido: $Artifact"
    }

    $fields = @{}
    for ($index = 1; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match '^([a-z_]+)=(.*)$') { $fields[$Matches[1]] = $Matches[2] }
    }
    foreach ($required in @('salt', 'iv', 'mac', 'payload')) {
        if (-not $fields.ContainsKey($required)) { throw "Artefato incompleto (campo '$required' ausente)." }
    }

    $salt = [Convert]::FromBase64String($fields.salt)
    $iv = [Convert]::FromBase64String($fields.iv)
    $cipher = [Convert]::FromBase64String($fields.payload)
    $expectedMac = [Convert]::FromBase64String($fields.mac)

    $rawKey = (Get-Content -LiteralPath $KeyFile -Raw -Encoding UTF8).Trim()
    try { $rawBytes = [Convert]::FromBase64String($rawKey) } catch { $rawBytes = $null }
    if ($rawBytes -and $rawBytes.Length -eq 64) {
        $aesKey = $rawBytes[0..31]
        $hmacKey = $rawBytes[32..63]
    } else {
        $iterations = 200000
        if ($fields.kdf -match 'PBKDF2-SHA256-(\d+)') { $iterations = [int]$Matches[1] }
        $derive = New-Object System.Security.Cryptography.Rfc2898DeriveBytes(
            $rawKey, $salt, $iterations, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
        $material = $derive.GetBytes(64)
        $aesKey = $material[0..31]
        $hmacKey = $material[32..63]
    }

    $headerText = (($lines | Where-Object { $_ -notmatch '^(mac|payload)=' }) -join "`n")
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = $hmacKey
    $mac = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($headerText + "`n") + $cipher)
    if (-not (Test-BackupMac -Computed $mac -Expected $expectedMac)) {
        throw 'Falha de integridade: HMAC do artefato cifrado nao confere (chave errada ou arquivo adulterado).'
    }

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.KeySize = 256
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.Key = $aesKey
    $aes.IV = $iv
    $decryptor = $aes.CreateDecryptor()
    $plain = $decryptor.TransformFinalBlock($cipher, 0, $cipher.Length)
    $decryptor.Dispose()
    $aes.Dispose()

    if (-not (Test-Path -LiteralPath $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }
    $zipPath = Join-Path $Destination 'backup.zip'
    [System.IO.File]::WriteAllBytes($zipPath, $plain)
    Expand-Archive -LiteralPath $zipPath -DestinationPath $Destination -Force
    Remove-Item -LiteralPath $zipPath -Force

    return $Destination
}
