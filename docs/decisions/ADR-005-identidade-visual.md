# ADR-005: Nova Identidade Visual — "Banca de Rua / Fliperama do Mangá Independente"

## Contexto
O protótipo inicial do frontend do MangaNetWorking utilizava uma estética dark com acentos dourados genéricos, cards cinza arredondados e fontes monoespaçadas em excesso. Essa abordagem assemelhava-se a um dashboard de SaaS/desenvolvedor e não comunicava a cultura editorial de mangás e zines independentes. Além disso, o amarelo era aplicado indistintamente em bordas, badges, textos e botões, enfraquecendo a hierarquia visual.

## Decisão
Adotar oficialmente a especificação definida em `IDENTIDADE_VISUAL.md`:
1. **Conceito:** "Banca de Rua / Fliperama do Mangá Independente" (panfleto de rua + computador retrô OS + adesivo/neo-brutalismo tátil + placar de fliperama).
2. **Tipografia:** 4 fontes com papéis estritos, self-hosted via pacotes `@fontsource`:
   - Display: `Anton` (títulos, ranking, botões, sempre caixa-alta).
   - Wordmark/Adesivos: `Bowlby One` (logo de adesivo, patches).
   - Corpo e UI: `Archivo Variable` (metadados com `tabular-nums`, parágrafos, sem monoespaçada).
   - Sistema: `Silkscreen` (microrrótulos de janelas `.EXE`, `SEASON 01`, `LV.2`).
3. **Cores:**
   - `--mn-ink` (`#0B0B0C`): 60% (preto-nanquim de fundo e texto sobre amarelo/papel).
   - `--mn-paper` (`#F4EFE3`): 30% com o amarelo (off-white de papel e bordas de adesivo).
   - `--mn-yellow` (`#FFD400`): amarelo como bloco sólido e 1 CTA primário por tela.
   - `--mn-red` (`#E8402F`): carimbo hanko para selos, alertas e "NOVO".
4. **Componentes e Layout:**
   - Container único de 1200px para alinhar header, feed, catálogo e perfil.
   - Bordas sólidas de 2px, cantos retos (raio 0 a 2px) e sombras duras deslocadas (`4px 4px 0 var(--drop)`).
   - Componente `<Win>` com barra de título e botão `×` para substituir cards cinza flutuantes.
   - Capas verticais 2:3 em destaque no Hero e nos cards.
   - Modo Leitor (`ReaderPage`) mantido estritamente limpo e minimalista para foco na leitura.

## Consequências
- A interface ganha atitude visual única, destacando-se de plataformas genéricas.
- O escopo afeta estritamente o código do frontend (`frontend/src/`), mantendo 100% dos contratos de backend, banco de dados e regras de negócio inalterados.
