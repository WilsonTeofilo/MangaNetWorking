# TASK-109: Decomposição do Monólito do App.tsx e Saneamento do Roteador Principal

## 1. Contexto & Problema
O arquivo `App.tsx` atingiu 543 linhas, acumulando múltiplas responsabilidades desproporcionais:
- Orquestração de rotas simuladas baseadas em abas manuais.
- Reconciliação e restauração de leitura (F5 em sessionStorage).
- Processamento de rotas especiais (`/reset-password`, `/vip`).
- Re-aceite de termos de privacidade LGPD.
- Renderização de banners flutuantes de status de pagamento e avisos de favoritos.
- Presença de hexadecimais legados (`#0B0B0C`, `#F4EFE3`, `#FFD400`).

## 2. Escopo da Solução
1. **Hook de Navegação & Sessão (`useAppNavigation.ts`):**
   - Isolar estado de abas, restauração de work/capítulo por slug via sessionStorage, tratamento de links com filtros de catálogo, eventos customizados `mn:open-work`, retorno pós-autenticação.
2. **Componente de Consentimento LGPD (`PrivacyConsentGate.tsx`):**
   - Isolar a tela modal obrigatória de re-aceite de termos quando a versão da política muda.
3. **Componente de Avisos Globais & Modais (`GlobalAppNotices.tsx`):**
   - Centralizar banners de aviso de biblioteca e retorno de gateway de pagamento, bem como os 5 modais flutuantes.
4. **Roteador de Telas por Aba (`AppTabRouter.tsx`):**
   - Centralizar o switch-case que entrega a visualização de cada aba (feed, catálogo, perfil, biblioteca, painéis de criador e moderação).
5. **Reescrita do `App.tsx`:**
   - Reduzir o orquestrador para menos de 120 linhas, eliminando valores hexadecimais em prol das variáveis CSS `var(--mn-*)`.

## 3. Critérios de Aceite
- [x] Extração de `useAppNavigation` sem perda de funcionalidades de restauração de leitura ou login return.
- [x] Extração de `PrivacyConsentGate`, `GlobalAppNotices` e `AppTabRouter`.
- [x] `App.tsx` reduzido de 543 para 114 linhas.
- [x] Purga das cores hexadecimais `#0B0B0C`, `#F4EFE3`, `#FFD400`.
- [x] TypeScript build (`npm run build`) validado com 0 erros.

Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
