---
name: Backend Spring
description: Procedimento para implementar ou corrigir controllers, application services, domínio e segurança de endpoints no backend Spring Boot do MangaNetWorking, com testes e autorização server-side.
---

# Skill — Backend Spring Boot

Use esta skill para mudanças no `backend/` (Java 21 + Spring Boot 3.4.x): endpoint novo, caso de uso, correção de bug, autorização, integração entre camadas ou segurança. Ela diz **como** executar; os **requisitos** estão nos reviews e a **estrutura de camadas** em `architecture.md`.

## Quando usar

- Controller, application service, domínio, repositório, DTO, tratamento de erro ou configuração de segurança.
- Correção de bug com efeito de comportamento no servidor.
- Não use para: layout React (skill `frontend-design`), migração/esquema (skill `database-design`) ou apenas revisar um diff (skill `code-review`).

## Contexto mínimo (leia só isto)

1. `architecture.md` e `security-checklist.md` (nesta pasta).
2. `docs/reviews/SECURITY_REQUIREMENTS.md` — obrigatório para qualquer endpoint ou dado sensível.
3. `docs/reviews/BUSINESS_RULES.md` — ao tocar monetização, publicação, moderação ou Seasons.
4. ADR pertinente em `docs/decisions/` (sessão/2FA = 002; pagamentos/idempotência = 003; conteúdo/LGPD = 004; monetização/VIP/mobile = 006).
5. O código real da fatia: controller → service → repositório/porta, e os testes do módulo.

## Procedimento

1. **Inspecione:** `git status` + diff. Identifique a fronteira API → service → repository/storage e o **ator autorizado** de cada operação.
2. **Entenda a causa** antes de corrigir. Para mudança de comportamento, escreva primeiro um teste que exponha a lacuna e veja-o falhar (RED).
3. **Implemente na camada certa:** controller fino (validação de DTO + delegação), regra no application service/domínio, persistência no repositório. Não vaze entidade JPA para o controller; use DTOs (records).
4. **Resolva identidade e autorização no servidor** via `SecurityContextUtils` — nunca confie em ID, papel, VIP ou ownership vindos do cliente (ver `security-checklist.md`).
5. **Feche o fluxo:** persistência, leitura/consumo, autorização, idempotência quando aplicável e mensagens de erro sem vazar detalhe interno.
6. **Teste (GREEN + suíte):** casos de sucesso, negativos, limites, ator não autorizado e estado de falha. Rode a suíte do módulo e depois a relevante do backend.
7. **Verifique:** `cmd /c mvn test` (ou o comando do projeto) + `git diff --check`. Relate o que rodou de verdade.

## Limites

- Regra de negócio, segurança e valores financeiros são **server-side**. A UI só reflete.
- Dinheiro com `BigDecimal`, `RoundingMode.HALF_UP`, 2 casas; taxas vêm de `PlatformProperties`, nunca hardcoded.
- Não altere contrato, banco, autenticação ou regra financeira incidentemente. Se precisar mudar decisão arquitetural, proponha ADR.

## Critérios de aceite

- Autorização verificada para anônimo, usuário comum, usuário sem ownership e papel autorizado.
- Comportamento novo coberto por teste que falhava antes; suíte e build verdes.
- Sem segredo, CPF/PIX, token, cookie ou stack trace em log/resposta.
- `security-checklist.md` revisado e o diff sem alteração fora do escopo.
