# Princípios visuais — Banca de Rua / Fliperama do Mangá Independente

Subconjunto **acionável** da spec. A fonte de verdade completa é `docs/IDENTIDADE_VISUAL.md`; em caso de conflito, ela vence. Aqui está o que se aplica em toda tela.

## Conceito (em uma frase)

O site é **panfleto de rua + computador antigo + adesivo + placar de fliperama**; o mangá (capas e páginas) é o protagonista colorido dentro dessa moldura. Deve parecer cena independente — não "festa retrô dos anos 90" e não "dashboard SaaS escuro".

Pilares:
1. **Amarelo é superfície, não tempero.** Blocos chapados de amarelo alternando com blocos de preto-nanquim.
2. **Tipografia como imagem.** Títulos condensados enormes, entrelinha colada, às vezes cortados pela borda do bloco.
3. **Linguagem de adesivo e janela antiga.** Contorno grosso, sombra dura deslocada, barra de título com `×`, selos levemente rotacionados.
4. **Seasons são um jogo.** Níveis viram patches/adesivos; XP em blocos; missões como quests.
5. **A leitura é sagrada.** O Modo Leitor é limpo e escuro, sem decoração.

## Tipografia (4 fontes, papéis fixos, self-hosted)

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Anton** | Títulos, card, ranking, nav, botões. Sempre caixa-alta, nunca < 18px. |
| Logo/Adesivo | **Bowlby One** | Wordmark, selos grandes, patches. Nunca em parágrafo. |
| Corpo/UI | **Archivo Variable** | Parágrafos, formulários, metadados e números (`tabular-nums`). |
| Sistema/Pixel | **Silkscreen** | Só microrrótulos caixa-alta (barra de janela, `SEASON 01`, `LV.2`). Mínimo 12px. |

Regras: mono **não** é corpo nem metadado; pixel font **não** vai em parágrafo; entrelinha colada é intencional em títulos grandes, mas nunca corte título de obra a ponto de perder informação.

## Cores e proporção

- `--mn-ink` `#0B0B0C` (fundo/texto sobre amarelo) · `--mn-paper` `#F4EFE3` (papel/bordas de adesivo) · `--mn-yellow` `#FFD400` (marca, bloco e CTA) · `--mn-red` `#E8402F` (carimbo: selo, alerta, "NOVO") · `--mn-ok` `#3DDC84` só para feedback de sucesso.
- Por tela: ink ≈ 60%, amarelo + paper ≈ 30%, vermelho ≤ 5%.
- Máximo **2 blocos amarelos grandes por viewport**, mais **1 CTA primário** por tela.
- Texto sobre amarelo é **sempre** ink. Vermelho nunca em texto corrido.
- Verde/roxo antigos (`GRÁTIS`, `MEMBROS`) saem; use o sistema de selos.
- Contexto claro/escuro muda borda e sombra: `.mn-on-dark` (edge `--mn-line`, drop paper) × `.mn-on-yellow`/`.mn-on-paper` (edge/drop ink).

## Layout, bordas e movimento

- Container único `max-width: 1200px` para header, feed, catálogo e perfis; a logo alinha na borda do conteúdo. Grid 12 colunas; escala de 4px.
- Seções grandes são faixas de largura total com cor própria, separadas por corte diagonal (`clip-path`) ou faixa/ticker.
- Borda `2px solid var(--edge)`; raio `0` (máx. 2px; exceção: avatar/selo circular).
- Sombra dura `4px 4px 0 var(--drop)` (6–8px em elementos grandes). **Nunca blur.**
- Hover sobe 2px (drop cresce); active desce 2px (drop zera); transição `120ms steps(2)`. Nada de easing suave.
- Movimento curto (120–180ms), `steps(2–4)`; marquee e animações contínuas **desligadas** em `prefers-reduced-motion`.

## Texturas e gráficos

Halftone (meio-tom) no fundo de hero/faixas, faixas diagonais, granulação de papel/xerox, símbolos soltos (`{ } * ✕`) como textura, ticker amarelo entre seções, adesivos decorativos (1–3 por tela, rotação ±3°, `aria-hidden`). Tudo via CSS/SVG inline — sem imagem pesada de fundo.

## Componentes (não reimplemente por página)

- **`<Button variant>`**: `primary` (amarelo, 1 por tela), `secondary` (outline), `ghost`, `danger` (vermelho). `min-height: 44px`, Anton 16px caixa-alta.
- **`<Win title>`**: substitui card cinza flutuante. Barra de título 28px, `×` num quadrado, corpo ink/paper. Máx. 2 por tela.
- **`<WorkCard>`**: capa 2:3, **o card inteiro é o link** (sem botão "Ver Obra"), coração sobre a capa (44×44, `aria-pressed`), título Anton 20px em até 2 linhas (`line-clamp-2` + `title`), metadados Archivo 14px.
- **`<Sticker kind>`**: selos `new`/`members`/`free`/`complete`/`hiatus`. **Só aparece quando diferencia** — se todos os itens teriam o mesmo badge, nenhum exibe.
- **`<RankRow>`**: numeral Anton gigante (1 preenchido, demais só contorno), capa pequena, metadados tabulares, separados por linha, sem cards.
- **`<LevelPatch>` / `<XpBar>` / `<QuestCard>`**: patches colecionáveis, XP em blocos, quests dentro de `<Win title="QUEST_SEMANAL.EXE">`.
- **Formulários**: label visível, `min-height: 44px`, foco com borda paper + drop amarelo, erro com borda vermelha **e** texto. OTP em 6 caixas quadradas com `autocomplete="one-time-code"`.

## Telas (resumo)

Feed: hero amarelo com capa vertical 2:3, ticker, "Em Alta" (`<RankRow>`), Continuar Lendo (`<Win>`), Novos Capítulos (grade), Seasons, rodapé. Catálogo: cabeçalho amarelo, busca, chips de gênero, grade. Ficha: capa grande, capítulos em linhas. **Leitor: fundo ink puro, sem textura/mascote/adesivo; anúncio rotulado, com altura reservada, sem imitar página.** Perfis: 1 número de destaque, metadados discretos, nada sensível. Auth: OTP + "Dev Outbox" só fora de produção.

## Voz e microcopy

Direta, de rua, curta, pt-BR. Nada de "Olá! Seja bem-vindo!". Ex.: `LER AGORA`, `Parou na pág. 12. Bora?`, `Só obra original. Pirataria = banimento.`, `SEASON 01 · FALTAM 23 DIAS`.

## Movimento e imagens

Sombras/estados em `steps()`. Capas sempre com cores originais. `<Cover>` gera fallback em CSS/SVG por hash do título; fotos aleatórias são placeholder marcado (`data-placeholder="true"`). Em produção, só upload validado. **Zero hotlink, zero personagem/obra de terceiros.**

## Negative prompt — não produzir

- **Nada de AI slop**: landing page genérica, hero indistinto, gradientes neon, blobs decorativos, glow, vidro/blur ou enfeite sem função.
- **Nada de dashboard SaaS escuro**: cards cinza arredondados, card dentro de card, tipografia sem hierarquia, excesso de cards.
- **Nada de sombra suave, gradiente decorativo, raio > 4px, paleta verde/roxa aleatória, amarelo em todo detalhe, mais de um CTA primário.**
- **Nada de mono como corpo/metadado, pixel font em parágrafo, texto miúdo/baixo contraste, animação contínua sem respeitar redução de movimento.**
- **Nada de decorar o Modo Leitor** nem competir com as páginas do mangá, nem causar salto de layout para anúncio.
- **Nada de hotlink** nem personagens/obras/logos/marcas de terceiros em arte, mock, capa, fallback ou exemplo.
- **Nada de inventar** marca, paleta ou regra comercial; não calcular permissão, preço, split, VIP ou acesso no frontend.
- **Nada de esconder** conteúdo funcional atrás de hover, cor isolada ou interação inacessível por teclado/toque.
- **Nada de copiar** referências (cartazes amarelos, "Space Coders"): elas inspiram linguagem, não conteúdo. Não introduzir loja/produto físico no visual.
