# TASK-107 — Decomposição Modular e Anti-Monólito da HomePage (Feed Editorial)

**Status:** Concluída  
**Autor:** Hermes (Tech Lead / Arquiteto)  
**Escopo:** `frontend/src/pages/HomePage.tsx` e `frontend/src/components/home/`  

---

## 1. Contexto e Diagnóstico

`HomePage.tsx` acumulou **580 linhas de código** em um único componente, acumulando 6 responsabilidades distintas da experiência da Home da Banca de Rua:
1. Hero de Destaque com carrossel rotativo, stickers e ações de leitura rápida.
2. Barra pegajosa (*sticky*) de seleção de formato (Tudo / Mangá / Light Novel).
3. Caixa retro `<Win>` com dados reais de "Continuar Lendo".
4. Grade de "Novos Capítulos" agrupados por obra com tempos relativos.
5. Trilhos de "Em Alta" separados estritamente por formato (Mangás em Alta e Light Novels em Alta).
6. Timeline de lançamentos agrupados por dia (Hoje, Ontem, etc.).

---

## 2. Arquitetura Modular Entregue

Criado o diretório: `frontend/src/components/home/` contendo:
- `useHomeNavigation.ts` (197 linhas): isola estado de formato na URL (`?inicio=...`), popstate, busca assíncrona de progresso de leitura, grupos de releases e timeline.
- `HomeHeroSection.tsx` (139 linhas): renderiza banner hero, carrossel e fallback de banca vazia.
- `HomeFormatBar.tsx` (34 linhas): barra sticky com `FormatSwitcher` e atalho para o catálogo.
- `HomeContinueReading.tsx` (84 linhas): bloco retro `<Win title="CONTINUAR_LENDO.EXE">` com progresso real.
- `HomeRecentReleases.tsx` (89 linhas): grade de novos capítulos com `WorkCard` e cold start CTA.
- `HomeTrendingRails.tsx` (89 linhas): rankings separados por formato sem mistura de dados.
- `HomeTimeline.tsx` (63 linhas): linha do tempo de lançamentos agrupada por dia.
- `HomePage.tsx` (133 linhas): orquestrador limpo e legível.

---

## 3. Critérios de Aceite Aprovados

- [x] `HomePage.tsx` reduzido de 580 para 133 linhas (< 150L).
- [x] 6 novos módulos especialistas criados em `frontend/src/components/home/`.
- [x] 100% da funcionalidade e acessibilidade preservadas.
- [x] Zero cores hexadecimais soltas (Design System oficial respeitado).
- [x] `npm.cmd run build` passou com sucesso em 2.60s (0 erros TS).

---
Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
