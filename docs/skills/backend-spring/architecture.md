# Arquitetura do backend

Fatos observados no código de `backend/src/main/java/com/manganetworking/`. Se divergir do código, o código vence — atualize este arquivo.

## Stack e fronteiras

- Java 21, Spring Boot 3.4.x, Maven. API REST stateless em `:8085` (dev), reutilizável pelo app mobile futuro (ADR-006).
- **PostgreSQL** (`:25432`): identidade, credenciais, catálogo, permissões, assinaturas, ledger financeiro — transações ACID.
- **MongoDB** (`:27017`): `reading_progress`, `feed_works`, `engagement_events`, `creator_missions` — escrita frequente, consistência eventual.
- **Storage**: interface `FileStorageService`; `LocalFileStorageService` grava em `./data/uploads/`. Binário nunca vai para banco; o banco guarda referência, MIME, dimensões e ordem (ADR-001).

## Camadas (Clean Architecture / DDD Lite)

```
controller/         → HTTP fino: validação de DTO + delegação ao application service
service/<área>/     → application services + dto/ (Java records) por caso de uso
domain/             → relational (JPA entities), nosql (Mongo documents), enums
repository/         → jpa/ e mongo/ (interfaces Spring Data)
config/             → security, properties (PlatformProperties), exception (advice)
algorithm/ util/    → recomendação, normalização, sanitização
```

Application services existentes: `AuthApplicationService`, `UserProfileApplicationService`, `WorkApplicationService`, `CreatorApplicationService`, `ModerationApplicationService`, `MonetizationService`, `FeedApplicationService`, `MobileOfflineApplicationService`, `SessionService`, `TwoFactorAuthService`. Use-os como exemplo de convenção.

## Convenções

- **DTOs**: Java records em `service/<área>/dto/`. Nunca expor entidade JPA/Document diretamente.
- **Erros**: exceções próprias (`ResourceNotFoundException`, `AccessDeniedException`) tratadas por `GlobalExceptionHandler` (`@RestControllerAdvice`). Mensagem clara, sem stack trace ou detalhe interno.
- **Identidade**: sempre via `SecurityContextUtils` (SecurityContextHolder) — ver `security-checklist.md`.
- **Configuração**: taxas, limites de rate limit, preço VIP e segredos em `PlatformProperties`/`application.yml`, nunca hardcoded.
- **Dinheiro**: `BigDecimal`, `RoundingMode.HALF_UP`, 2 casas; split 83/17, 58/42, VIP ~R$ 23/30 dias (ADR-003/006).
- **Storage**: validação de magic bytes e allow-list MIME (JPEG/PNG/WebP), nome gerado no servidor, bloqueio de path traversal.

## Como adicionar um caso de uso

1. DTO de entrada/saída (record) em `service/<área>/dto/`.
2. Método no application service, recebendo a identidade autenticada e retornando o DTO de saída.
3. Fronteira HTTP no controller: `@PreAuthorize`/regra de papel quando couber + `@Valid` no DTO.
4. Persistência via repositório existente; nova consulta só se necessária (ver skill `database-design`).
5. Teste do service em `src/test/.../service/<área>/` cobrindo sucesso, negativos e autorização.

## Comandos

- Testes: `cmd /c mvn test` (a partir de `backend/`).
- Banco local: `docker-compose.yml` (Postgres 25432, Mongo 27017).
- Migrações: Flyway, `backend/src/main/resources/db/migration/V*__*.sql` (não edite versão já aplicada).
