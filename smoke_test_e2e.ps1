# Smoke Test E2E Automatizado - MangaNetWorking
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8085"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       SMOKE TEST E2E COMPLETO - MANGANETWORKING          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
# `example.invalid` e um dominio reservado (RFC 2606): existe para nunca ser usado.
# Mesmo que um e-mail de teste escape para um SMTP real, ele nao volta como
# "Address not found" para ninguem.
$testEmail = "smoke_creator_$timestamp@example.invalid"
$testPassword = "Smoke safe phrase 2026!"
$policy = Invoke-RestMethod -Uri "$baseUrl/api/auth/policy" -Method Get

# ---------------------------------------------------------------------------
# MODO DE E-MAIL: o smoke NUNCA pode disparar mensagem real.
# O OTP do smoke e lido do Dev Outbox (backend com PLATFORM_MAIL_ENABLED=false)
# ou do Mailpit local. Se o backend estiver apontando para um SMTP de verdade
# (ex.: smtp.gmail.com), o proprio script troca o backend para o Dev Outbox e
# devolve o modo original no fim — sem isso o e-mail de teste volta como
# "Address not found" na caixa de quem cadastrou.
# ---------------------------------------------------------------------------
$script:mailModeSwitched = $false
$script:originalMailEnabled = $null

function Get-BackendEnv([string]$name) {
    # Chamadas nativas (docker) escrevem avisos em stderr: com ErrorActionPreference=Stop
    # isso viraria erro fatal. Aqui o preference e relaxado e restaurado em seguida.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $container = (docker compose ps -q backend 2>$null | Select-Object -First 1)
        if (-not $container) { return $null }
        $value = (docker exec $container printenv $name 2>$null | Select-Object -First 1)
        if ($null -eq $value) { return $null }
        return "$value".Trim()
    } catch {
        return $null
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Wait-BackendReady([int]$timeoutSeconds = 180) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-RestMethod -Uri "$baseUrl/api/auth/policy" -Method Get -ErrorAction Stop | Out-Null
            return $true
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    return $false
}

function Set-BackendMailEnabled([bool]$enabled) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $env:PLATFORM_MAIL_ENABLED = if ($enabled) { 'true' } else { 'false' }
        docker compose up -d --force-recreate backend 2>&1 | Out-Null
        Wait-BackendReady | Out-Null
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Restore-MailMode {
    if (-not $script:mailModeSwitched) { return }
    Write-Host "`n[mail] Devolvendo o backend ao modo de e-mail original..." -NoNewline
    Set-BackendMailEnabled ($script:originalMailEnabled -ne 'false')
    $script:mailModeSwitched = $false
    Write-Host " OK" -ForegroundColor Green
}

# Falha padronizada: devolve o modo de e-mail antes de sair.
function Fail([string]$message) {
    Restore-MailMode
    Write-Host " FALHA ($message)" -ForegroundColor Red
    exit 1
}

# Qualquer erro inesperado (inclusive de uma chamada HTTP que estoura o limite)
# tambem precisa devolver o modo de e-mail original antes de encerrar.
trap {
    Restore-MailMode
    Write-Host " ERRO NAO TRATADO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$mailHost = Get-BackendEnv 'MAIL_HOST'
$mailEnabled = Get-BackendEnv 'PLATFORM_MAIL_ENABLED'
$script:originalMailEnabled = $mailEnabled
$usesRealSmtp = ($mailEnabled -ne 'false') `
    -and [bool]$mailHost `
    -and ($mailHost -ne 'mailpit') `
    -and ($mailHost -notlike '*localhost*') `
    -and ($mailHost -notlike '127.0.0.1*') `
    -and ($mailHost -notlike '*.invalid')

if ($usesRealSmtp) {
    Write-Host "[mail] SMTP real detectado ($mailHost): o smoke roda com o Dev Outbox para nao enviar e-mail de verdade." -ForegroundColor Yellow
    Set-BackendMailEnabled $false
    $script:mailModeSwitched = $true
    Write-Host "[mail] Dev Outbox ativo (PLATFORM_MAIL_ENABLED=false)." -ForegroundColor Green
}

# OTP local pode estar no Dev Outbox (mail desabilitado) ou no Mailpit (mail habilitado).
function Get-LatestOtp([string]$Email) {
    try {
        $outbox = Invoke-RestMethod -Uri "$baseUrl/api/dev/outbox/latest?email=$([uri]::EscapeDataString($Email))" -Method Get
        if ($outbox.otpCode) { return $outbox.otpCode }
    } catch {
        # 404 é esperado quando o adaptador SMTP/Mailpit está ativo.
    }

    $mailpitBase = "http://localhost:8025/api/v1"
    $messages = Invoke-RestMethod -Uri "$mailpitBase/messages?limit=25" -Method Get
    $target = $messages.messages | Where-Object {
        $_.To | Where-Object { $_.Address -eq $Email }
    } | Select-Object -First 1
    if (-not $target) {
        throw "OTP não encontrado para $Email no Dev Outbox nem no Mailpit. O smoke roda com PLATFORM_MAIL_ENABLED=false (Dev Outbox) ou MAIL_HOST=mailpit; com SMTP real o script troca o backend para o Dev Outbox automaticamente."
    }

    $message = Invoke-RestMethod -Uri "$mailpitBase/message/$($target.ID)" -Method Get
    $match = [regex]::Match("$($message.Text) $($message.HTML)", '\b\d{6}\b')
    if (-not $match.Success) {
        throw "E-mail encontrado, mas sem código OTP de 6 dígitos para $Email"
    }
    return $match.Value
}

$webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Teste de Rejeição LGPD (Cadastro sem aceite dos termos)
Write-Host "`n[1/12] Validando rejeição de cadastro sem consentimento LGPD..." -NoNewline
try {
    $bodyNoConsent = @{
        email = "noconsent_$timestamp@example.invalid"
        password = $testPassword
        name = "No Consent"
    username = "noconsent"
    sex = "NAO_INFORMADO"
        isCreator = $false
        termsAccepted = $false
        privacyPolicyVersion = $policy.version
        birthDate = "2000-01-01"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $bodyNoConsent -ContentType "application/json"
    Fail "Deveria rejeitar sem aceite dos termos!"
} catch {
    if ([int]$_.Exception.Response.StatusCode -ne 400) {
    Fail "Esperado HTTP 400; recebido: $([int]$_.Exception.Response.StatusCode)"
    }
    Write-Host " SUCESSO (400 Bad Request recebido corretamente)" -ForegroundColor Green
}

# 2. Cadastro com Consentimento LGPD (Art. 7º/8º e 14)
Write-Host "[2/12] Cadastrando novo criador com consentimento e maioridade..." -NoNewline
$regBody = @{
    email = $testEmail
    password = $testPassword
    name = "Smoke Creator $timestamp"
    username = "smoke.creator.$($timestamp.ToString().Substring($timestamp.ToString().Length - 8))"
    sex = "NAO_INFORMADO"
    isCreator = $true
    instagramUrl = "https://instagram.com/smoke.creator"
    termsAccepted = $true
    privacyPolicyVersion = $policy.version
    birthDate = "1995-07-20"
} | ConvertTo-Json

$regResp = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $regBody -ContentType "application/json"
if ($regResp.status -ne "2FA_REQUIRED") {
    Fail "Esperado status 2FA_REQUIRED, recebido: $($regResp.status)"
}
Write-Host " SUCESSO (Status: 2FA_REQUIRED)" -ForegroundColor Green

# 3. Resgate de OTP no adaptador local (Dev Outbox ou Mailpit)
Write-Host "[3/12] Consultando adaptador local seguro para resgate do código OTP..." -NoNewline
$otpCode = Get-LatestOtp $testEmail
if (-not $otpCode) {
    Fail "Código OTP não encontrado no adaptador local"
}
Write-Host " SUCESSO (OTP obtido)" -ForegroundColor Green

# 4. Validação de 2FA e Emissão de Cookie de Sessão HttpOnly
Write-Host "[4/12] Validando 2FA e capturando cookie de sessão..." -NoNewline
$verifyBody = @{
    email = $testEmail
    code = $otpCode
} | ConvertTo-Json

$authResp = Invoke-RestMethod -Uri "$baseUrl/api/auth/2fa/verify" -Method Post -Body $verifyBody -ContentType "application/json" -WebSession $webSession
if ($authResp.status -ne "AUTHENTICATED") {
    Fail "Status esperado AUTHENTICATED, recebido: $($authResp.status)"
}
$creatorId = $authResp.user.creatorId
Write-Host " SUCESSO (Usuário: $($authResp.user.name), Creator ID: $creatorId)" -ForegroundColor Green

# 5. Consulta de Identidade Segura (/api/auth/me)
Write-Host "[5/12] Verificando sessão autenticada em /api/auth/me..." -NoNewline
$meResp = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -WebSession $webSession
if ($meResp.email -ne $testEmail) {
    Fail "E-mail não bate com a sessão"
}
if (-not $meResp.isCreator) {
    Fail "Esperado isCreator: true"
}
Write-Host " SUCESSO (isCreator: $($meResp.isCreator), Handle: $($meResp.creatorHandle))" -ForegroundColor Green

# 6. Step-Up 2FA em Ação Crítica: Alteração de Chave PIX
Write-Host "[6/12] Testando Step-Up 2FA para atualização de chave PIX..." -NoNewline
# O mesmo OTP de LOGIN não autoriza troca de PIX. Aguarda o cooldown da emissão do cadastro.
Start-Sleep -Seconds 61
$null = Invoke-RestMethod -Uri "$baseUrl/api/auth/2fa/request" -Method Post -WebSession $webSession

$pixOtp = Get-LatestOtp $testEmail

$pixBody = @{
    pixKey = "chave.pix.$timestamp@banco.com"
    pixKeyType = "EMAIL"
    twoFactorCode = $pixOtp
} | ConvertTo-Json

$pixResp = Invoke-RestMethod -Uri "$baseUrl/api/creators/pix-key" -Method Put -Body $pixBody -ContentType "application/json" -WebSession $webSession
Write-Host " SUCESSO (Chave PIX atualizada com Step-Up 2FA)" -ForegroundColor Green

# 7. Upload de Imagem Real com Validação de Magic Bytes
Write-Host "[7/12] Realizando upload de imagem PNG com magic bytes válidos..." -NoNewline
# Criar PNG 1x1 pixel válido
$pngBytes = [byte[]]@(
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
)
$tempPng = [System.IO.Path]::GetTempFileName() + ".png"
[System.IO.File]::WriteAllBytes($tempPng, $pngBytes)

$boundary = [System.Guid]::NewGuid().ToString()
$uploadUrl = "$baseUrl/api/storage/upload"
$fileBytes = [System.IO.File]::ReadAllBytes($tempPng)
$fileHeader = "--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"cover.png`"`r`nContent-Type: image/png`r`n`r`n"
$fileFooter = "`r`n--$boundary--`r`n"
$bodyBytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($fileHeader) + $fileBytes + [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($fileFooter)

$request = [System.Net.HttpWebRequest]::Create($uploadUrl)
$request.Method = "POST"
$request.ContentType = "multipart/form-data; boundary=$boundary"
$request.CookieContainer = $webSession.Cookies
$request.ContentLength = $bodyBytes.Length
$reqStream = $request.GetRequestStream()
$reqStream.Write($bodyBytes, 0, $bodyBytes.Length)
$reqStream.Close()

$response = $request.GetResponse()
$resStream = $response.GetResponseStream()
$reader = New-Object System.IO.StreamReader($resStream)
$resJson = $reader.ReadToEnd() | ConvertFrom-Json
$coverUrl = $resJson.url
Remove-Item $tempPng -Force
Write-Host " SUCESSO (Cover URL: $coverUrl)" -ForegroundColor Green

# 8. Criação de Obra com Declaração de Autoria Original
Write-Host "[8/12] Criando nova obra com autoria original declarada..." -NoNewline
$workBody = @{
    title = "Smoke E2E Obra $timestamp"
    # A sinopse tem 100-500 caracteres (regra do produto).
    synopsis = "Sinopse gerada pelo script de validacao de ponta a ponta do MangaNetWorking: obra de teste criada automaticamente para validar cadastro, capa, capitulo com paginas, publicacao e exclusao LGPD no catalogo oficial da plataforma."
    coverUrl = $coverUrl
    genres = @("ACAO", "SCI_FI")
    originalAuthorDeclaration = $true
} | ConvertTo-Json

$workResp = Invoke-RestMethod -Uri "$baseUrl/api/works" -Method Post -Body $workBody -ContentType "application/json" -WebSession $webSession
$workId = $workResp.workId
Write-Host " SUCESSO (Work ID: $workId, Slug: $($workResp.slug))" -ForegroundColor Green

# 9. Publicação de Capítulo e Proteção via ChapterFileAccessGuard
Write-Host "[9/12] Publicando capítulo e vinculando páginas..." -NoNewline
$chapBody = @{
    chapterNumber = 1
    title = "Capítulo 1 - Genesis"
    coverUrl = $coverUrl
    pages = @($coverUrl)
    publicReleaseAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
} | ConvertTo-Json

$chapResp = Invoke-RestMethod -Uri "$baseUrl/api/works/$workId/chapters" -Method Post -Body $chapBody -ContentType "application/json" -WebSession $webSession
Write-Host " SUCESSO (Capítulo #1 criado com páginas vinculadas)" -ForegroundColor Green

# 10. Endpoint financeiro legado deve permanecer bloqueado sem checkout confirmado
Write-Host "[10/12] Confirmando que o endpoint legado não credita doação fictícia..." -NoNewline
$donateBody = @{ creatorId = $creatorId; amountBrl = 100.00; paymentExternalId = "PAY-SMOKE-$timestamp" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "$baseUrl/api/monetization/donate" -Method Post -Body $donateBody -ContentType "application/json" -WebSession $webSession
    Fail "Endpoint legado não deveria processar pagamento!"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 410) {
    Fail "Esperado HTTP 410, recebido: $($_.Exception.Response.StatusCode.value__)"
    }
}
Write-Host " SUCESSO (HTTP 410, nenhum crédito fictício processado)" -ForegroundColor Green

# 11. Exportação de Dados Pessoais (LGPD Art. 18, V)
Write-Host "[11/12] Testando portabilidade de dados do titular (LGPD)..." -NoNewline
$exportResp = Invoke-RestMethod -Uri "$baseUrl/api/users/me/export" -Method Get -WebSession $webSession
if (-not $exportResp.email -or $exportResp.email -ne $testEmail) {
    Fail "Dados exportados incompletos"
}
if (-not ($exportResp.PSObject.Properties.Name -contains "financialHistory") -or -not ($exportResp.PSObject.Properties.Name -contains "privacyConsentHistory")) {
    Fail "Históricos financeiros/consentimento ausentes na exportação"
}
Write-Host " SUCESSO (JSON estruturado exportado: $($exportResp.email))" -ForegroundColor Green

# 12. Direito ao Esquecimento LGPD & Revogação Imediata de Sessão
Write-Host "[12/12] Executando exclusão e anonimização de conta (Art. 18, VI)..." -NoNewline
Invoke-RestMethod -Uri "$baseUrl/api/users/me" -Method Delete -WebSession $webSession

# Verificar se a sessão foi revogada imediatamente
try {
    Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -WebSession $webSession
    Fail "Cookie ainda autentica após delete!"
} catch {
    if ([int]$_.Exception.Response.StatusCode -ne 401) {
    Fail "Esperado HTTP 401 após exclusão; recebido: $([int]$_.Exception.Response.StatusCode)"
    }
    Write-Host " SUCESSO (Sessão revogada imediatamente, HTTP 401 retornado)" -ForegroundColor Green
}

Restore-MailMode

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " SMOKE TEST E2E: 12/12 ETAPAS APROVADAS COM SUCESSO TOTAL! " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
