# TASK-CLEAN-ARCH-001 — Desacoplamento de Repositórios em Controllers (Clean Architecture)

**Status:** Especificada pelo Tech Lead Hermes  
**Executor:** OpenCode Backend Worker  
**Escopo:** Backend Spring Boot (`com.manganetworking.controller` e `com.manganetworking.service.monetization`)  

---

## 1. Contexto e Objetivo

Na auditoria de Clean Architecture do MangaNetWorking, identificamos que dois controllers violam o princípio de segregação de camadas ao injetarem e executarem consultas diretamente em instâncias de `JpaRepository`:

1. **`CreatorController.java`**:
   - Injeta `UserRepository userRepository`.
   - No método `applyAsWriter(...)`, executa `userRepository.findById(userId)`.
   - **Correção:** Remover a dependência de `UserRepository`. A entidade `UserEntity` já está associada e acessível via `creator.getUser()`, eliminando qualquer necessidade de acesso ao repositório pelo controller.

2. **`MonetizationController.java`**:
   - Injeta `FinancialLedgerRepository ledgerRepository`.
   - No método `getCreatorLedger(...)`, executa `ledgerRepository.findAllByCreatorIdOrderByCreatedAtDesc(creatorId)` e mapeia entidades para DTO.
   - **Correção:** Adicionar o método de consulta no serviço `MonetizationService` (`getCreatorLedger(UUID creatorId)`), injetar `MonetizationService` no controller e remover completamente o `FinancialLedgerRepository` do controller.

---

## 2. Instruções Técnicas Passo a Passo

### Passo 1: Atualizar `MonetizationService.java`
- Adicionar o método com anotação `@Transactional(readOnly = true)`:
```java
@Transactional(readOnly = true)
public java.util.List<com.manganetworking.service.monetization.dto.LedgerEntryResponseDto> getCreatorLedger(UUID creatorId) {
    return ledgerRepository.findAllByCreatorIdOrderByCreatedAtDesc(creatorId)
            .stream()
            .map(com.manganetworking.service.monetization.dto.LedgerEntryResponseDto::from)
            .toList();
}
```

### Passo 2: Refatorar `MonetizationController.java`
- Remover o campo `private final FinancialLedgerRepository ledgerRepository;`.
- Remover a importação de `com.manganetworking.repository.jpa.FinancialLedgerRepository;`.
- Injetar `MonetizationService monetizationService` via construtor.
- No método `getCreatorLedger(@PathVariable UUID creatorId)`:
  - Manter a verificação de segurança (`currentCreatorId.equals(creatorId)`).
  - Substituir a chamada direta ao repositório por `return ResponseEntity.ok(monetizationService.getCreatorLedger(creatorId));`.

### Passo 3: Refatorar `CreatorController.java`
- Remover o campo `private final UserRepository userRepository;`.
- Remover a importação de `com.manganetworking.repository.jpa.UserRepository;`.
- Ajustar o construtor do `CreatorController` para receber apenas `CreatorApplicationService`, `CreatorFollowService` e `SessionService`.
- No método `applyAsWriter(...)`:
  - Utilizar `creator.getUser()` retornado de `creatorService.applyAsWriter(userId, dto)` para chamar `sessionService.createSession(...)`:
    ```java
    UserEntity user = creator.getUser();
    if (user != null) {
        sessionService.createSession(user, creator, response);
    }
    ```

---

## 3. Critérios de Aceite

- [ ] `CreatorController.java` não possui nenhuma referência a `UserRepository` ou `repository.jpa`.
- [ ] `MonetizationController.java` não possui nenhuma referência a `FinancialLedgerRepository` ou `repository.jpa`.
- [ ] `MonetizationService.java` expõe `getCreatorLedger(UUID creatorId)` retornando `List<LedgerEntryResponseDto>`.
- [ ] Compilação limpa sem warnings de dependência cíclica.
- [ ] Suíte completa do backend verde: `Set-Location D:\Projetos\MangaNetWorking\backend; mvn -o test` (447 testes passando, 0 falhas).
- [ ] Relatório gerado em `docs/orquestracao/backend/relatorios/RELATORIO-CLEAN-ARCH-001.md`.

---
Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
