# Segredos e Configuração de Ambiente

Este documento descreve como configurar os segredos do MangaNetWorking para diferentes ambientes.

## Visão Geral

O sistema tem três tipos de segredos críticos:

1. **Chave AES-256**: Usada para criptografar dados sensíveis (CPF e chaves PIX de criadores) em repouso no banco.
2. **Credenciais do Banco de Dados**: Usuário e senha do PostgreSQL.
3. **Credenciais de E-mail (SMTP)**: Usuário, senha e remetente usados no envio do código 2FA.

### E-mail (SMTP) e marca do remetente

O `From:` do e-mail usa o nome **MangaNetWorking** e um endereço do domínio próprio. Não é possível enviar como `@manganetworking.com` sem possuir o domínio e configurar SPF/DKIM/DMARC — o Gmail gratuito só permite o endereço da própria conta (ou um alias verificado). O plano completo está em `docs/orquestracao/EMAIL-E-2FA.md`.

Variáveis obrigatórias em produção (a aplicação deve **falhar o boot** se ausentes):

- `MAIL_HOST` — host SMTP do provedor (ex.: `smtp.resend.com`).
- `MAIL_PORT` — porta (587 com STARTTLS ou 465 com SSL).
- `MAIL_USERNAME` / `MAIL_PASSWORD` — credenciais do provedor.
- `MAIL_FROM` — endereço do domínio próprio (ex.: `nao-responda@manganetworking.com`).
- `MAIL_FROM_NAME` — nome de exibição (padrão `MangaNetWorking`).

Em desenvolvimento, **não** use Gmail: suba o Mailpit (`docker compose up -d mailpit`) e acesse a caixa em `http://localhost:8025`.

## Configuração por Ambiente

### Desenvolvimento Local (Docker Compose)

1. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. O `.env` já contém valores padrão seguros para desenvolvimento:
   - `POSTGRES_PASSWORD=manga_dev_local_secure_2026`
   - Chave AES: será usada a chave de desenvolvimento embutida no código

3. Inicie os serviços:
   ```bash
   docker compose up -d
   ```

### Produção

#### 1. Gerar Chave AES-256 Segura

```bash
# Linux/macOS
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

A chave gerada deve ter pelo menos 32 caracteres ASCII. Exemplo:
```
AES_SECRET_KEY=yJ8Vk2qLp5RwT9zXcN7mB4nH1jK6gF3dS0aP8qW2eR5tY7uI9oO4pL3kM6nB9v
```

#### 2. Configurar Variáveis de Ambiente

Métodos recomendados:

**Docker Compose em produção**:
```yaml
# docker-compose.prod.yml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_PROD}
  
  backend:
    environment:
      AES_SECRET_KEY: ${AES_SECRET_KEY}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD_PROD}
```

**Kubernetes / Docker Swarm**:
Use Secrets do Kubernetes ou Docker Swarm.

**Servidor tradicional**:
Defina as variáveis no sistema operacional ou no systemd service file.

#### 3. Credenciais do Mercado Pago (Assinatura VIP e Doações)

Para receber pagamentos reais na sua conta Mercado Pago:

1. Acesse o **[Mercado Pago Developers](https://www.mercadopago.com.br/developers)**.
2. Faça login com a sua conta do Mercado Pago (onde o dinheiro deve cair).
3. Vá em **"Suas integrações"** -> Selecione ou crie sua aplicação (ex: `MangaNetWorking`).
4. No menu lateral, clique em **"Credenciais de Produção"**.
5. Copie o **Access Token** de produção (começa com `APP_USR-...`).
6. No menu lateral, clique em **"Webhooks"**:
   - Defina a URL de notificação: `https://seu-dominio.com/api/monetization/mercadopago/webhook`
   - Marque os eventos: **Pagamentos (payment)**.
   - Copie a **Chave Secreta de Assinatura** (Webhook Secret).
7. Configure as variáveis no seu `.env` ou servidor:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx-xxxx-xxxx-xxxx
   MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta_webhook_aqui
   MERCADOPAGO_NOTIFICATION_URL=https://seu-dominio.com/api/monetization/mercadopago/webhook
   MERCADOPAGO_BACK_URL_BASE=https://seu-dominio.com
   ```

#### 4. Credenciais de E-mail (SMTP Real vs Mailpit Local)

**Opção 1: Gmail Pessoal com Senha de App (Grátis para começar)**:
1. Acesse sua Conta Google -> **Segurança**.
2. Ative a **Verificação em 2 etapas** (se já não estiver ativa).
3. Na busca de configurações da conta, digite **"Senhas de app"**.
4. Crie uma senha chamada `MangaNetWorking`.
5. O Google gerará uma senha de 16 letras (ex: `abcd efgh ijkl mnop`).
6. Configure no `.env`:
   ```env
   PLATFORM_MAIL_ENABLED=true
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_SMTP_AUTH=true
   MAIL_SMTP_STARTTLS=true
   MAIL_USERNAME=seu_email@gmail.com
   MAIL_PASSWORD=suasenhave16letrassemespacos
   MAIL_FROM=seu_email@gmail.com
   MAIL_FROM_NAME=MangaNetWorking
   ```

**Opção 2: Provedor Transacional Profissional (Resend ou Brevo - 3000 emails/mês grátis)**:
- Resend (`smtp.resend.com`, porta 587, user: `resend`, pass: chave de API).
- Brevo (`smtp-relay.brevo.com`, porta 587, user: email de login, pass: chave SMTP).

#### 5. Valores Mínimos para Produção

| Variável | Descrição | Valor Recomendado |
|----------|-----------|-------------------|
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | Senha complexa > 16 caracteres |
| `AES_SECRET_KEY` | Criptografia de CPF/PIX | String Base64 de 32+ bytes |
| `SPRING_PROFILES_ACTIVE` | Perfil Spring Boot | `prod` (desativa dev outbox e h2) |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de cobrança real | `APP_USR-...` |
| `PLATFORM_MAIL_ENABLED` | Ativação do SMTP real | `true` |

## Rotação de Chaves

### Chave AES

**IMPORTANTE**: Rotacionar a chave AES inviabiliza a leitura dos dados já criptografados.

Procedimento para rotacionar:

1. Descriptografar todos os dados com a chave antiga
2. Configurar nova chave no ambiente
3. Recifrar todos os dados com a nova chave

Script de exemplo (executar com cuidado):
```sql
-- 1. Exportar dados descriptografados
-- 2. Atualizar AES_SECRET_KEY no ambiente
-- 3. Importar dados (serão recifrados na inserção)
```

### Senha do PostgreSQL

1. Alterar senha no PostgreSQL:
   ```sql
   ALTER USER postgres WITH PASSWORD 'nova_senha_segura';
   ```

2. Atualizar variável de ambiente em todos os serviços que usam o banco
3. Reiniciar serviços

## Verificação

### Verificar se AES_SECRET_KEY está configurada

Os logs do backend mostrarão:

```
[AES-CRYPTO] AES_SECRET_KEY não configurada; usando chave de desenvolvimento local.
```

Se esta mensagem aparecer em produção, configure imediatamente a variável.

### Testar criptografia

```bash
# Executar teste unitário do AesCryptoConverter
cd backend
mvn test -Dtest=AesCryptoConverterTest
```

## Segurança Adicional

1. **Never commit `.env`**: Adicione `.env` ao `.gitignore`
2. **File permissions**: Restrinja leitura do `.env` a usuários autorizados
3. **Audit logs**: Monitore acessos aos segredos
4. **Regular rotation**: Rotacione senhas periodicamente (exceto chave AES)

## Referências

- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [PostgreSQL Password Encryption](https://www.postgresql.org/docs/current/auth-password.html)