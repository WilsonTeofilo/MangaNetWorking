# TASK-003: Frontend — Painel do Criador — remover dados fabricados e alinhar paleta

**Responsável:** OpenCode Frontend  
**Status:** Rascunho (aguardando spec-review)  
**Data:** 2026-10-19

## 1. Objetivo Técnico
Corrigir a falsidade de dados visuais no painel do criador. O backend devolve apenas `monetizationLevel`, missions, boost e ganhos. A UI está usando valores hardcodeados (`EVEREST 340/500`, “EVEREST 01”, “23 dias”, “SEMANA 03”). Devemos exibir apenas o que o servidor realmente devolve e evitar exibição de números fabricados.

## 2. Contratos & Regras de Negócio
- Backend não oferece XP, season, contador de dias até o fim da season. A UI deve omiti-los ou mostrar um estado neutro.
- A direção visual (“Banca de Rua”) exige uso de tokens CSS válidos (`--mn-red: #E8402F`, `--mn-paper`, etc.), não cores literals.
- XP/season só podem ser mostrados quando o backend expuser esses campos posteriormente.

## 3. Escopo (máximo 2 arquivos)
- `frontend/src/pages/CreatorWorkspacePage.tsx`
- `frontend/src/styles/tokens.css` (se necessário para introduzir uma utilidade)

## 4. Critérios de Aceite
- [ ] Nenhum placeholder de XP (340/500) fabricado.
- [ ] Nenhum placeholder de season fresca (SEASON 01, “Faltam 23 dias”, SEMANA 03).
- [ ] XP é exibido apenas se o backend expuser; hoje é omitido.
- [ ] A paleta criada exclusivamente localmente em `CreatorWorkspacePage.tsx` usa token `--mn-red` ou `--mn-paper` (existente) de tokens.css/global.css.
- [ ] Critérios de identidade de frontend (antônio, dimensões, estágios) são mantidos; leitores e pages de leitor não sofrem mudanças alheias.
- [ ] `npm run build` passa.
- [ ] Relatório oficial gerado em `docs/orquestracao/frontend/relatorios/RELATORIO-003.md`.

## 5. Dependências
- `frontend/src/pages/CreatorWorkspacePage.tsx` (depende de backend `CreatorWorkspaceResponseDto` que já é consumida).
- `frontend/src/styles/tokens.css` e `global.css` (fonte de tokens de cor existente).

## 6. Relatório Esperado
Nome do arquivo: `RELATORIO-003.md`  
Conteúdo mínimo:
- Lista de arquivos modificados.
- Explicação de como se removeu cada dado fabricado.
- Como a paleta foi ajustada para usar tokens.
- Linha de resumo do `npm run build`.

## 7. Tipo de Mudança
Frontend, sem alteração de contrato, sem regra de negócio, sem dados de backend.

**Assinado por:** OpenCode Tech Lead (Modo Plan)