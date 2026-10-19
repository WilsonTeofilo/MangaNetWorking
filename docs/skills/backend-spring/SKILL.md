---
name: Backend Spring Boot
description: Procedimento canônico para implementar ou evoluir controllers, application services, domínio, segurança e testes no backend Spring Boot do MangaNetWorking.
---

# Skill — Backend Spring Boot (MangaNetWorking)

Use esta skill para qualquer alteração no `backend/` (Java 21 + Spring Boot 3.4.x): novos endpoints, regras de negócio, refatoração de camadas, segurança, concorrência e testes unitários/slice.

---

## 1. Arquitetura e Fronteiras Tecnológicas

- **Stack:** Java 21, Spring Boot 3.4.x, Maven. API REST stateless na porta `8085`.
- **PostgreSQL 16 (`localhost:25432`):** Fonte transacional ACID. Identidade, usuários, catálogo de obras e capítulos, assinaturas, doações e financial ledger.
- **MongoDB 7 (`localhost:27017`):** Modelo NoSQL para alta vazão de escrita e cache de leitura: `reading_progress`, `creator_missions` e `feed_works`.
- **Armazenamento de Arquivos (`FileStorageService`):** Filesystem local sanitizado (`./data/uploads/`). Binários nunca vão para o banco; o banco armazena apenas caminhos relativos e metadados. Páginas de capítulos são blindadas pelo `ChapterFileAccessGuard` através do índice único `chapter_files.filename`.

### Estrutura de Camadas (Clean Architecture / DDD Lite)
```
com.manganetworking/
├── controller/         # HTTP fino: validação de DTO (@Valid) + delegação ao application service
├── service/<área>/     # Application services e subpacote dto/ (Java records imutáveis)
├── domain/relational/  # Entidades JPA (PostgreSQL) com getters/setters e construtores
├── domain/nosql/       # Documentos MongoDB (@Document, @Indexed)
├── repository/jpa/     # Interfaces Spring Data JPA
├── repository/mongo/   # Interfaces Spring Data MongoDB
├── config/             # Spring Security, PlatformProperties, Exception Advice
└── util/               # SanitizationUtils, StorageFileNames, AesCryptoConverter
```

---

## 2. Padrões de Código e Convenções Inegociáveis

1. **DTOs com Java Records:** Entidades de persistência (@Entity / @Document) NUNCA são expostas diretamente nos controllers.
2. **Tratamento Centralizado de Erros:** Exceções de domínio (`ResourceNotFoundException`, `AccessDeniedException`, `ValidationException`) tratadas por `@RestControllerAdvice` em `GlobalExceptionHandler`. Controllers nunca usam blocos try-catch manuais para formatar respostas.
3. **Resolução Autoritativa de Identidade:** O usuário atual é resolvido via `SecurityContextUtils` (SecurityContextHolder). Proibido receber `userId` ou `creatorId` do cliente para autorização (mitigação contra IDOR).
4. **Precisão Monetária:** Cálculos financeiros com `BigDecimal`, 2 casas decimais e arredondamento `RoundingMode.HALF_UP`. Taxas e percentuais injetados de `PlatformProperties`.
5. **Magic Bytes no Upload:** Validação obrigatória da assinatura binária de arquivos em `LocalFileStorageService` (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF` + `WEBP`).

---

## 3. Checklist de Segurança & LGPD Obrigatório

Antes de concluir qualquer tarefa de backend, passe pelo checklist:

- [ ] **Identidade e Autorização:** Identidade resolvida pelo servidor; permissões de `ROLE_CREATOR` e `ROLE_MODERATOR` checadas autoritativamente.
- [ ] **Step-Up 2FA:** Ações sensíveis (como alteração de chave PIX) exigem verificação de código OTP do 2FA.
- [ ] **Sessão Segura:** Cookies emitidos com `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` (em prod).
- [ ] **LGPD & Dados Pessoais:** CPF e chave PIX criptografados em repouso com AES-256-GCM. Exclusão de conta anonimiza perfil, revoga sessões em memória (`SessionStore.removeByUserId`) e apaga binários físicos do storage.
- [ ] **Path Traversal & Storage:** Proteção estrita contra `..` e separadores de diretório. Nome de arquivo gerado por UUID no servidor.
- [ ] **Zero Hardcoded Secrets:** Chaves criptográficas e senhas injetadas via variáveis de ambiente com fail-fast no boot em profile `prod`.

---

## 4. Passo a Passo para Adicionar um Novo Caso de Uso

1. **DTOs de Entrada e Saída:** Crie records imutáveis em `service/<área>/dto/` com anotações de validação (`@NotBlank`, `@NotNull`).
2. **Método no Application Service:** Implemente a regra de negócio recebendo o DTO e a identidade autenticada, orquestrando repositórios e eventos.
3. **Fronteira no Controller:** Endpoint fino anotado com `@PreAuthorize`, `@Valid` e `@RequestBody`, delegando diretamente ao service.
4. **Testes Automatizados:** Crie testes unitários/slice em `src/test/java/...` cobrindo cenários felizes, entradas inválidas, acesso não autorizado e falhas.
5. **Verificação Local:** Execute no terminal:
   ```powershell
   cmd /c mvn test
   ```
   Garanta que a suíte passe 100% sem erros ou quebras de regressão.
