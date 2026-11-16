# TASK-111: Decomposição do Monólito do Leitor de Mangás e Prosa (ReaderPage.tsx)

## 1. Contexto & Problema
O arquivo `ReaderPage.tsx` atingiu 511 linhas, centralizando:
- Gerenciamento de ciclo de vida e busca assíncrona do capítulo via API (`workApi.readChapter`).
- Resolução de dados offline em cache local via `offlineStorage`.
- Ciclo de anúncio forçado a cada 30 páginas com acumulação de leitura.
- Toggle de curtidas de capítulo com persistência e feedback tátil.
- Persistência e sincronização de configurações de prosa (tamanho de fonte, entrelinha, largura).
- Modos de leitura (paginado vs vertical contínuo).
- Renderização concorrente de cabeçalho, barra de progresso, bloqueio de early access, visualizador de mangá/prosa, comentários e rodapé com botões de paginação entre capítulos.

## 2. Escopo da Solução
1. **Hook de Estado do Leitor (`useReaderState.ts`):**
   - Isolar estado assíncrono de páginas, modo de leitura, preferências de prosa, curtidas, contadores e slots de anúncio.
2. **Cabeçalho do Leitor (`ReaderHeader.tsx`):**
   - Isolar botões de voltar, título/capítulo, barra de ajustes de prosa, alternador de modo de leitura, indicador de página atual, botão de apoio monetário e botão de denúncia.
3. **Barra de Progresso do Leitor (`ReaderProgressBar.tsx`):**
   - Isolar a barra tátil de progresso para os modos PROSE e IMAGE_PAGES.
4. **Bloqueio de Membros (`ReaderEarlyAccessLock.tsx`):**
   - Componente isolado para aviso 403 de acesso antecipado exclusivo para membros.
5. **Rodapé de Navegação do Leitor (`ReaderNavigationFooter.tsx`):**
   - Isolar botão de favoritar e botões táteis de avançar/voltar capítulos.
6. **Reescrita de `ReaderPage.tsx`:**
   - Reduzir o orquestrador para ~160 linhas atuando de forma declarativa e modular.

## 3. Critérios de Aceite
- [x] Extração de `useReaderState`, `ReaderHeader`, `ReaderProgressBar`, `ReaderEarlyAccessLock` e `ReaderNavigationFooter`.
- [x] `ReaderPage.tsx` reduzido de 511 para 163 linhas.
- [x] Preservação integral da telemetria de leitura, histórico offline e comentários do capítulo.
- [x] TypeScript build (`npm run build`) validado com 0 erros.

Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
