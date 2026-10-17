# TASK-001: Desacoplamento de Sessão (`SessionStore`) e Limpeza Ativa Anti-Memory Leak

**Responsável:** OpenCode Backend  
**Status:** CONCLUÍDO (Auditado e Aprovado pelo Tech Lead)  
**Data:** 2026-10-17  

---

### 1. Objetivo Técnico
Refatorar o armazenamento de sessões de usuário no `SessionService` para desacoplar a estrutura de memória através de uma porta orientada a domínio (`SessionStore`), permitindo suporte futuro a stores distribuídos (Redis) e implementando rotina ativa periódica de expurgo de sessões expiradas conforme recomendações OWASP.

---

### 2. Contratos & Regras de Negócio
- **Porta:** Criar `SessionStore` com métodos `save`, `findById`, `delete`, `removeExpired` e `countActive`.
- **Adaptador:** Criar `InMemorySessionStore` thread-safe usando `ConcurrentHashMap`.
- **Injeção de Dependência:** `SessionService` deve receber `SessionStore` via construtor com campos `final`.
- **Expurgo Ativo:** Adicionar método `@Scheduled` com intervalo configurável via `platform.security.session-cleanup-interval-ms` (default: 1 hora).
- **Concorrência:** Operações de expurgo atômicas sem risco de *ConcurrentModificationException* ou race conditions.

---

### 3. Critérios de Aceite
- [x] Interface `SessionStore` e implementação `InMemorySessionStore` criadas.
- [x] Injeção de dependência por construtor no `SessionService`.
- [x] Rotina `@Scheduled` para expurgo ativo de sessões expiradas.
- [x] Testes unitários para `InMemorySessionStoreTest` cobrindo adição, remoção, contagem e expurgo.
- [x] Teste unitário para delegação do scheduler em `SessionServiceTest`.
- [x] Todos os 163 testes do backend passando verde.
- [x] Zero alterações no frontend.
