# Smoke Test E2E Automatizado - MangaNetWorking
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8085"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       SMOKE TEST E2E COMPLETO - MANGANETWORKING          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$testEmail = "smoke_creator_$timestamp@test.com"
$testPassword = "Smoke safe phrase 2026!"
$policy = Invoke-RestMethod -Uri "$baseUrl/api/auth/policy" -Method Get

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
        throw "OTP não encontrado para $Email no Dev Outbox nem no Mailpit"
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
        email = "noconsent_$timestamp@test.com"
        password = $testPassword
        name = "No Consent"
        isCreator = $false
        termsAccepted = $false
        privacyPolicyVersion = $policy.version
        birthDate = "2000-01-01"
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $bodyNoConsent -ContentType "application/json"
    Write-Host " FALHA (Deveria rejeitar sem aceite dos termos!)" -ForegroundColor Red
    exit 1
} catch {
    if ([int]$_.Exception.Response.StatusCode -ne 400) {
        Write-Host " FALHA (Esperado HTTP 400; recebido: $([int]$_.Exception.Response.StatusCode))" -ForegroundColor Red
        exit 1
    }
    Write-Host " SUCESSO (400 Bad Request recebido corretamente)" -ForegroundColor Green
}

# 2. Cadastro com Consentimento LGPD (Art. 7º/8º e 14)
Write-Host "[2/12] Cadastrando novo criador com consentimento e maioridade..." -NoNewline
$regBody = @{
    email = $testEmail
    password = $testPassword
    name = "Smoke Creator $timestamp"
    isCreator = $true
    handle = "smoke_creator_$timestamp"
    termsAccepted = $true
    privacyPolicyVersion = $policy.version
    birthDate = "1995-07-20"
} | ConvertTo-Json

$regResp = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $regBody -ContentType "application/json"
if ($regResp.status -ne "2FA_REQUIRED") {
    Write-Host " FALHA (Esperado status 2FA_REQUIRED, recebido: $($regResp.status))" -ForegroundColor Red
    exit 1
}
Write-Host " SUCESSO (Status: 2FA_REQUIRED)" -ForegroundColor Green

# 3. Resgate de OTP no adaptador local (Dev Outbox ou Mailpit)
Write-Host "[3/12] Consultando adaptador local seguro para resgate do código OTP..." -NoNewline
$otpCode = Get-LatestOtp $testEmail
if (-not $otpCode) {
    Write-Host " FALHA (Código OTP não encontrado no adaptador local)" -ForegroundColor Red
    exit 1
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
    Write-Host " FALHA (Status esperado AUTHENTICATED, recebido: $($authResp.status))" -ForegroundColor Red
    exit 1
}
$creatorId = $authResp.user.creatorId
Write-Host " SUCESSO (Usuário: $($authResp.user.name), Creator ID: $creatorId)" -ForegroundColor Green

# 5. Consulta de Identidade Segura (/api/auth/me)
Write-Host "[5/12] Verificando sessão autenticada em /api/auth/me..." -NoNewline
$meResp = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -WebSession $webSession
if ($meResp.email -ne $testEmail) {
    Write-Host " FALHA (E-mail não bate com a sessão)" -ForegroundColor Red
    exit 1
}
if (-not $meResp.isCreator) {
    Write-Host " FALHA (Esperado isCreator: true)" -ForegroundColor Red
    exit 1
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
    synopsis = "Sinopse gerada pelo script de validação de ponta a ponta."
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
    Write-Host " FALHA (Endpoint legado não deveria processar pagamento!)" -ForegroundColor Red
    exit 1
} catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 410) {
        Write-Host " FALHA (Esperado HTTP 410, recebido: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
        exit 1
    }
}
Write-Host " SUCESSO (HTTP 410, nenhum crédito fictício processado)" -ForegroundColor Green

# 11. Exportação de Dados Pessoais (LGPD Art. 18, V)
Write-Host "[11/12] Testando portabilidade de dados do titular (LGPD)..." -NoNewline
$exportResp = Invoke-RestMethod -Uri "$baseUrl/api/users/me/export" -Method Get -WebSession $webSession
if (-not $exportResp.email -or $exportResp.email -ne $testEmail) {
    Write-Host " FALHA (Dados exportados incompletos)" -ForegroundColor Red
    exit 1
}
if (-not ($exportResp.PSObject.Properties.Name -contains "financialHistory") -or -not ($exportResp.PSObject.Properties.Name -contains "privacyConsentHistory")) {
    Write-Host " FALHA (Históricos financeiros/consentimento ausentes na exportação)" -ForegroundColor Red
    exit 1
}
Write-Host " SUCESSO (JSON estruturado exportado: $($exportResp.email))" -ForegroundColor Green

# 12. Direito ao Esquecimento LGPD & Revogação Imediata de Sessão
Write-Host "[12/12] Executando exclusão e anonimização de conta (Art. 18, VI)..." -NoNewline
Invoke-RestMethod -Uri "$baseUrl/api/users/me" -Method Delete -WebSession $webSession

# Verificar se a sessão foi revogada imediatamente
try {
    Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method Get -WebSession $webSession
    Write-Host " FALHA (Cookie ainda autentica após delete!)" -ForegroundColor Red
    exit 1
} catch {
    if ([int]$_.Exception.Response.StatusCode -ne 401) {
        Write-Host " FALHA (Esperado HTTP 401 após exclusão; recebido: $([int]$_.Exception.Response.StatusCode))" -ForegroundColor Red
        exit 1
    }
    Write-Host " SUCESSO (Sessão revogada imediatamente, HTTP 401 retornado)" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " SMOKE TEST E2E: 12/12 ETAPAS APROVADAS COM SUCESSO TOTAL! " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
