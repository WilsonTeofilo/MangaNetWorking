---
name: Design de frontend
description: Procedimento para criar, redesenhar ou revisar telas e componentes React do MangaNetWorking sem perder a identidade visual, com direção estética e negative prompt contra design genérico.
---

# Skill — Design de frontend MangaNetWorking

Use esta skill para qualquer trabalho visual no `frontend/`: tela nova, componente, token, responsividade, interação, acessibilidade ou revisão de UI. Ela diz **como** executar; o **contexto de produto** continua nos reviews e a **especificação visual completa** em `docs/IDENTIDADE_VISUAL.md`.

## Quando usar

- Nova tela, componente, fluxo visual ou revisão de UI.
- Alteração de tokens, tipografia, cores, layout, componentes, movimento ou acessibilidade.
- Não use para decidir contrato de API, regra de negócio, permissão ou valor financeiro — isso é backend.

## Contexto mínimo (leia só isto)

1. `visual-principles.md` (nesta pasta) — direção visual acionável e negative prompt.
2. `docs/IDENTIDADE_VISUAL.md` — spec detalhada; consulte a seção da tela que vai tocar, não precisa decorar tudo.
3. `quality-checklist.md` (nesta pasta) — critérios de aceite antes de fechar.
4. Do projeto: `docs/reviews/BUSINESS_RULES.md` (para não contradizer regra visível) e os componentes/tokens existentes em `frontend/src/`.
5. Do backend: só o **contrato** que a tela consome (tipos em `frontend/src/api/` e `frontend/src/types/`). Nunca recriar a regra no cliente.

## Procedimento

1. **Inspecione:** rode `git status`, veja o diff e os componentes/tokens existentes. Entenda o fluxo de dados da tela antes de mexer no visual.
2. **Defina a hierarquia:** conteúdo principal, ação primária (1 por tela) e informação de apoio. Preserve o comportamento existente.
3. **Reutilize:** use os componentes de `frontend/src/components/ui/` (`Button`, `Win`, `Sticker`, `WorkCard`, `Cover`, `RankRow`, `LevelPatch`, `XpBar`, `QuestCard`, `Field`, `OtpInput`, `Marquee`). Não crie uma segunda versão local.
4. **Construa em fatia vertical:** implemente a tela/estado necessário com responsividade e estados loading/vazio/erro/sucesso, teclado e foco. Não misture refatoração visual geral com mudança de API.
5. **Aplique as regras:** siga `visual-principles.md` (fontes, cores, bordas, sombras, movimento) e evite tudo que está no negative prompt.
6. **Revise composição e acessibilidade:** teste viewport estreito e desktop, contraste, alvo de toque, conteúdo longo, imagens quebradas e `prefers-reduced-motion`.
7. **Verifique:** rode `npm run build`, releia o diff e reporte o que ainda depende de backend ou conteúdo real. Passe o `quality-checklist.md`.

## Limites

- A interface **reflete** estado retornado pela API; não calcula split, preço, VIP, nível, missão, permissão nem early access.
- Nada de dado sensível (CPF/PIX) em tela pública, placeholder ou mock.
- O Modo Leitor é intocável quanto a decoração: leitura limpa é regra de produto, não preferência estética.

## Negative prompt e critérios

O detalhamento do que **não** produzir está em `visual-principles.md` (seção "Negative prompt") e a lista de aceite em `quality-checklist.md`. Consulte os dois antes de dizer que terminou.
