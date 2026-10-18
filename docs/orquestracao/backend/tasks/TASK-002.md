# TASK-002: Desacoplamento de Rate Limiting (`RateLimitStore`) e Limpeza Ativa Anti-DoS

**Responsável:** OpenCode Backend  
**Janela / Combo no 9Router:** `9router/Backend`  
**Modelo Sugerido para Iniciar:** `kgw/poolside/laguna-s-2.1:free`  
**Modelo de Fallback (se falhar):** `mmg/MiniMax-M3` ou `kr/deepseek-3.2`  
**Arquivos de Leitura Autorizados (Máx 3):**
1. `backend/src/main/java/com/manganetworking/config/security/RateLimitingFilter.java`
2. `backend/src/test/java/com/manganetworking/config/security/RateLimitingFilterTest.java`
3. `backend/src/main/java/com/manganetworking/service/session/SessionStore.java` (referência de padrão Porta/Adaptador)

---

### 1. Objetivo Técnico
Seguindo o padrão de Clean Architecture aplicado com sucesso no `SessionStore` (TASK-001), desacoplar a lógica de armazenamento e incremento de requisições do `RateLimitingFilter` através de uma porta de domínio (`RateLimitStore`).
Isso elimina o acoplamento com `ConcurrentHashMap` direto no filtro HTTP e prepara a arquitetura para suportar rate limiting distribuído (Redis) em múltiplas instâncias.

---

### 2. Contratos & Regras de Negócio

1. **Porta (`RateLimitStore`):**
   - Criar interface `com.manganetworking.config.security.RateLimitStore` com:
     - `int incrementAndGet(String key, long minuteBucket);`
     - `void evictStale(long currentMinute);`
     - `int countActiveBuckets();`
2. **Adaptador (`InMemoryRateLimitStore`):**
   - Criar implementação `@Component` `InMemoryRateLimitStore` thread-safe.
   - Usar `ConcurrentHashMap` com `compute` atômico para incremento e `removeIf` para expurgo.
3. **Injeção no Filtro (`RateLimitingFilter`):**
   - O `RateLimitingFilter` deve receber `RateLimitStore` via construtor com injeção de dependência.
   - Manter retrocompatibilidade total com as propriedades de limites existentes em `PlatformProperties`.
4. **Limpeza Ativa Agendada:**
   - Adicionar rotina de limpeza ativa via `@Scheduled` ou delegada para evitar vazamento de memória sob ataque de spoofing com ampla gama de IPs.
5. **Critérios de Segurança:**
   - Operações estritamente atômicas ($O(1)$) sem race conditions.
   - Retornar HTTP 429 (`TOO_MANY_REQUESTS`) em JSON padronizado quando o limite for ultrapassado.

---

### 3. Critérios de Aceite
- [ ] Interface `RateLimitStore` criada.
- [ ] Implementação `InMemoryRateLimitStore` criada e anotada como `@Component`.
- [ ] `RateLimitingFilter` refatorado para usar injeção por construtor de `RateLimitStore`.
- [ ] Testes unitários para `InMemoryRateLimitStoreTest` cobrindo incremento atômico, virada de bucket e expurgo de minutos antigos.
- [ ] Testes do `RateLimitingFilterTest` atualizados e passando verde.
- [ ] Todos os 163 testes do backend passando (`mvn test` sem falhas).
- [ ] Zero alterações no frontend.
- [ ] Relatório oficial emitido em `docs/orquestracao/backend/relatorios/RELATORIO-002-rate-limit-store.md`.

---
**Assinado por:** Hermes (Tech Lead / Gerente / Arquiteto)
