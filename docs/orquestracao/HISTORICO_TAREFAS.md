# Histórico de Tarefas, Relatórios e Auditorias Concluídas

> **Registro Histórico Consolidado**  
> Este documento arquiva o histórico de ordens de serviço (tasks), relatórios de implementação e pareceres de auditoria executados durante o desenvolvimento do MangaNetWorking.

---

## 1. Linha do Tempo de Tarefas Concluídas

### TASK-001: Session Store Cleanup & Desacoplamento
- **Objetivo:** Isolar e desacoplar a gestão de sessões HTTP em memória, criando a porta `SessionStore` e a implementação `InMemorySessionStore`.
- **Arquivos Tocados:** `SessionService.java`, `SessionStore.java`, `InMemorySessionStore.java`.
- **Status:** ✅ Concluído e auditado (PARECER-001 APROVADO).
- **Evidência:** Sessões expiram corretamente por TTL; sem concorrência destrutiva no `ConcurrentHashMap`.

---

### TASK-002: Rate Limit Store In-Memory
- **Objetivo:** Extração do controle de taxa de requisições por IP para porta desacoplada `RateLimitStore` e implementação `InMemoryRateLimitStore`.
- **Arquivos Tocados:** `RateLimitingFilter.java`, `RateLimitStore.java`, `InMemoryRateLimitStore.java`.
- **Status:** ✅ Concluído e auditado (PARECER-002 APROVADO).
- **Evidência:** Limite de 15 req/min para rotas críticas de autenticação e denúncia; 120 req/min global; headers `Retry-After` formatados.

---

### TASK-003: Purga de Placeholders e Design System no Frontend
- **Objetivo:** Remoção de mocks e placeholders de XP (`340/500`), temporadas e dias no painel do criador (`CreatorWorkspacePage.tsx`). Conversão de cores literais para tokens CSS `var(--mn-*)`.
- **Arquivos Tocados:** `frontend/src/pages/CreatorWorkspacePage.tsx`, `frontend/src/styles/global.css`, `frontend/src/components/ui/`.
- **Status:** ✅ Concluído e auditado (RELATORIO-003 / RELATORIO-004 FE).
- **Evidência:** `npm run build` aprovado em 2.02s (1640 módulos). Zero menção hardcoded de XP no workspace.

---

### TASK-004: Hardening de LGPD, Sessão, Cookie e Rate Limiting
- **Objetivo:** Resolver achados críticos de segurança identificados na auditoria:
  1. Revogação de sessões em memória no momento do delete de conta LGPD (`SessionStore.removeByUserId`).
  2. Anonimização de perfil do criador (`CreatorEntity`), remoção de binários de avatar do storage.
  3. Configuração de `SameSite=Lax` e `Secure` no cookie de sessão via `PlatformProperties`.
  4. Eliminação de registro duplicado de filtros (`FilterRegistrationBean#setEnabled(false)`).
  5. Desoneração de assets estáticos e storage no `RateLimitingFilter`.
- **Arquivos Tocados:** `UserProfileApplicationService.java`, `SessionService.java`, `SecurityConfig.java`, `RateLimitingFilter.java`, `PlatformProperties.java`, `LocalFileStorageService.java`.
- **Status:** ✅ Concluído (189 testes verdes).

---

### TASK-005: Regularização e Blindagem Final (Passes 15 e 16)
- **Objetivo:** Finalização do ciclo com Flyway V5 (`terms_accepted_at`, `birth_date`), validação de termos no cadastro, step-up 2FA em alteração de chave PIX (`PUT /api/creators/pix-key`), maioridade (18+) para monetização e despublicação de obras no esquecimento (`status = 'archived_lgpd'`).
- **Arquivos Tocados:** `V5__lgpd_consent_and_work_archival.sql`, `UserEntity.java`, `RegisterRequestDto.java`, `AuthApplicationService.java`, `CreatorApplicationService.java`, `CreatorController.java`, `UpdatePixKeyRequestDto.java`, `LocalFileStorageService.java`, `LoginPage.tsx`, `CreatorWorkspacePage.tsx`.
- **Status:** ✅ Concluído e verificado (189 testes verdes, 0 falhas).
