---
name: Revisão de código
description: Procedimento para revisar um diff do MangaNetWorking quanto a contratos, autorização server-side, regressões, testes e vazamento de dados, com achados em ordem de severidade.
---

# Skill — Revisão de código

Use esta skill para revisar mudanças (locais ou de um subagente) antes de considerar o trabalho pronto. Revisar é **verificar evidência**, não confiar em descrição. Ela diz **como** revisar; os requisitos estão nos reviews.

## Quando usar

- Revisão de diff, PR ou entrega de outro agente.
- Validação final de uma fatia vertical antes de commit/handoff.
- Investigação de regressão ou risco de segurança.
- Não use para implementar a correção (volte à skill da área).

## Contexto mínimo

1. `docs/reviews/SECURITY_REQUIREMENTS.md` e `BUSINESS_RULES.md`.
2. `docs/reviews/IMPLEMENTATION_STATUS.md` — estado/handoff, não garantia.
3. `docs/skills/backend-spring/security-checklist.md` e `docs/skills/frontend-design/quality-checklist.md` conforme a área do diff.
4. O diff completo, incluindo **arquivos não rastreados**.

## Procedimento

1. **Estabeleça o escopo:** `git status` + `git diff` + não rastreados. Leia o que mudou de fato, não o que foi dito.
2. **Confirme o contrato:** API, DTO, eventos e tipos do frontend continuam coerentes entre si. Mudança de contrato sem intenção explícita é achado.
3. **Teste a autorização (server-side):** para cada endpoint tocado, anônimo, usuário comum, sem ownership e papel autorizado. UI nunca é prova de permissão.
4. **Procure vazamento:** CPF/PIX/segredo/token/cookie/stack trace em resposta, log, DTO, mock ou placeholder público.
5. **Cace regressão:** caminhos alternativos, estados de erro, idempotência, early access, obra suspensa refletida em catálogo/feed/leitor.
6. **Cheque testes:** existe teste que falharia antes da mudança? Cobre negativo, limite e autorização? Rode a suíte e o build relevantes.
7. **Reporte em ordem de severidade** com arquivo e linha, causa e correção sugerida. Separe bloqueador de observação.

## Escala de severidade

- **Bloqueador** — quebra segurança, autorização, dado, dinheiro, contrato ou regressão clara. Não pode entrar.
- **Alto** — risco provável ou teste ausente em comportamento crítico.
- **Médio** — correção necessária, mas sem risco imediato.
- **Baixo/observação** — estilo, clareza, dívida técnica.

## Limites

- Revisor **não edita** arquivos; aponta. Correção volta para a skill da área.
- Não marque requisito como concluído por estar no roadmap ou na descrição. Confirme código, autorização, persistência, integração e teste.
- Não exagere o escopo verificado: diga exatamente o que rodou e o que ficou pendente.

## Critérios de aceite

- Todo arquivo do diff (incluindo não rastreados) foi lido.
- Achados têm severidade, arquivo/linha e causa; bloqueadores são explícitos.
- Foi dito o comando exato rodado e seu resultado, sem exagerar cobertura.
