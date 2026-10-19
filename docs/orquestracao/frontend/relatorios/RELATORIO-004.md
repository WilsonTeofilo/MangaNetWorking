# RELATÓRIO-004 — Frontend V9: Tokenização de componentes base (FE-V9-5-continua)

**Autor:** OpenCode Frontend
**Referência:** FE-V9-5 (badges/selos e componentes base) — continuação pós-TASK-003

## Arquivos Modificados
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Win.tsx`
- `frontend/src/components/ui/WorkCard.tsx`
- `frontend/src/components/ui/Field.tsx`
- `frontend/src/components/ui/Cover.tsx`

## Mapa de migração literal → token CSS
Hexadecimal | Token CSS | Semântica
--- | --- | ---
`#E8402F` | `var(--mn-red)` | vermelho selo/alerta
`#F4EFE3` | `var(--mn-paper)` | papel/texto
`#A9A59A` | `var(--mn-mute)` | texto desativado
`#0B0B0C` | `var(--mn-ink)` | tinta principal
`#151517` | `var(--mn-ink-2)` | fundo superfície
`#212125` | `var(--mn-ink-3)` | fundo profundo
`#34343A` | `var(--mn-line)` | divisória
`#FFD400` | `var(--mn-yellow)` | amarelo CTA
`#E0B800` | `var(--mn-yellow-press)` | amarelo pressionado
`#3DDC84` | `var(--mn-ok)` | sucesso verde

## Como foi aplicado
- Substituição literal realizada via script pontual, **sem alterar estruturas de componentes** (props, variantes e lógica preservadas).
- `Button.tsx`: variantes primary/secondary/danger mantiveram sua lógica; o único literal preservado é `rgba(244,239,227,0.08)` (hover sutil secundário) — fora do escopo hexadecimal e semântico.
- `Cover.tsx`: o array de thumbnails (`bg`/`text`/`pattern`) foi convertido para `var(--mn-*)` mantendo o mesmo mapa de cores.
- `Field.tsx` / `Win.tsx` / `WorkCard.tsx`: incluídos tons usados em `shadow-[...]`, `border-[...]` e `fill-[...]`.

## Verificação
- `grep` por `#[0-9A-Fa-f]{6}` nas 5 páginas: **0 ocorrências** nas componentes atingidas.
- `npm run build` → `tsc` sem erros; Vite: `✓ built in 2.02s` (1640 modules).

## Observações / Aberturas (não atendidas nesta task)
Componentes fora do escopo declarado (FE-V9-5 = badges/selos + bases) mantiveram literais. Para tokenização completa geral, sugerir task separada:
- `Marquee.tsx`, `RankRow.tsx`, `OtpInput.tsx` — literais `#FFD400`/`#A9A59A`/`#151517` persistem.

## Tipo de mudança
Frontend, sem alteração de contrato.

**Assinado por:** OpenCode Frontend
