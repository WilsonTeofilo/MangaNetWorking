# Segredos e Configuração de Ambiente

Este documento descreve como configurar os segredos do MangaNetWorking para diferentes ambientes.

## Visão Geral

O sistema tem dois tipos de segredos críticos:

1. **Chave AES-256**: Usada para criptografar dados sensíveis (CPF e chaves PIX de criadores) em repouso no banco.
2. **Credenciais do Banco de Dados**: Usuário e senha do PostgreSQL.

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

#### 3. Valores Mínimos para Produção

| Variável | Valor Recomendado |
|----------|-------------------|
| `POSTGRES_PASSWORD` | Senha complexa > 16 caracteres |
| `AES_SECRET_KEY` | String Base64 de 32+ bytes |
| `SPRING_PROFILES_ACTIVE` | `prod` (remove endpoints de desenvolvimento) |

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