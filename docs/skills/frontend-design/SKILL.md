---
name: Frontend Design & UI
description: Procedimento canônico para criar, redesenhar ou auditar componentes e telas React do MangaNetWorking com o Design System Banca de Rua.
---

# Skill — Frontend Design & UI (MangaNetWorking)

Use esta skill para qualquer trabalho de interface no `frontend/` (React 19 + TypeScript + Vite + Tailwind CSS v4): novas páginas, refatoração de componentes, estilização, responsividade, acessibilidade e prevenção de design genérico.

---

## 1. Identidade Visual "Banca de Rua / Fliperama Indie"

O MangaNetWorking possui uma estética autoral inspirada em **panfletos de rua, adesivos, computadores antigos e placares de fliperama**, onde as obras (capas e páginas) são o protagonista colorido dentro dessa moldura crua.

### Pilares Visuais
1. **Amarelo é Superfície:** Blocos chapados de amarelo (`--mn-yellow` `#FFD400`) contrastando com fundo preto-nanquim (`--mn-ink` `#0B0B0C`).
2. **Tipografia de Impacto:**
   - **Anton:** Títulos, botões, rankings, caixas-altas expressivas.
   - **Bowlby One:** Wordmark, badges grandes e patches de adesivo.
   - **Archivo:** Textos corridos, formulários, parágrafos e números tabulares (`tabular-nums`).
   - **Silkscreen (Pixel Font):** Apenas microrrótulos de sistema (`LV.2`, `SEASON 01`, títulos de janela). Mínimo 12px.
3. **Bordas & Sombras Duras:** Borda `2px solid var(--edge)`, cantos retos (raio máx. 2px), sombra dura `4px 4px 0 var(--drop)` sem desfoque (zero blur).
4. **Modo Leitor é Sagrado:** Fundo escuro limpo, sem texturas, sem adesivos ou distrações. A leitura do mangá é prioridade absoluta.

---

## 2. Paleta Oficial de Tokens CSS

Use sempre os tokens CSS oficiais declarados em `src/styles/global.css`:
- `var(--mn-ink)`: `#0B0B0C` (fundo principal escuro e texto sobre amarelo)
- `var(--mn-paper)`: `#F4EFE3` (papel, bordas claras e texto sobre escuro)
- `var(--mn-yellow)`: `#FFD400` (marca, faixas e botão CTA primário)
- `var(--mn-red)`: `#E8402F` (carimbos, alertas, tags NOVO)
- `var(--mn-ok)`: `#3DDC84` (feedback de sucesso)

> Proibido o uso de hexadecimais literais espalhados no JSX/Tailwind.

---

## 3. Negative Prompt — O Que NUNCA Fazer

- ❌ **Zero AI Slop / Glassmorphism:** Sem gradientes neon genéricos, sem blur/vidro fosco, sem cantos super arredondados (`rounded-2xl`/`rounded-3xl`).
- ❌ **Zero Dashboard SaaS Cinza:** Proibido encher a tela de cards cinzas dentro de cards cinzas sem hierarquia tipográfica.
- ❌ **Zero Placeholders Falsos:** Proibido exibir saldos de carteira hardcoded, XP inventado ou datas fictícias na interface.
- ❌ **Zero Cálculo de Regra no Cliente:** O frontend nunca calcula splits de comissão, preços de VIP, permissões ou elegibilidade de missões. A interface apenas consome e reflete o que o backend retorna.
- ❌ **Zero Menção a Loja Física:** Nunca crie botões de carrinho, frete, estoque ou venda de produtos físicos.

---

## 4. Checklist de Qualidade & Acessibilidade

Antes de finalizar qualquer alteração na interface, confira:

- [ ] **Contraste Mínimo:** Texto sobre amarelo sempre com `var(--mn-ink)`. Contraste ≥ 4.5:1 em textos normais.
- [ ] **Hierarquia:** Apenas 1 botão CTA primário amarelo por tela.
- [ ] **Reuso de Componentes:** Utilizar componentes de `src/components/ui/` (`Button`, `Win`, `Sticker`, `WorkCard`, `Cover`, `Field`).
- [ ] **Estados da Tela:** Tratamento explícito de loading, estado vazio, erro legível e feedback de sucesso.
- [ ] **Acessibilidade:** Navegação funcional por teclado, foco visível (`:focus-visible`), atributos `alt` em imagens e rótulos acessíveis em botões de ícone.
- [ ] **Build sem Erros:** Executar e validar no PowerShell:
  ```powershell
  cmd /c npm run build
  ```
  Garantir que a compilação do TypeScript e do Vite conclua limpa sem warnings impeditivos.
