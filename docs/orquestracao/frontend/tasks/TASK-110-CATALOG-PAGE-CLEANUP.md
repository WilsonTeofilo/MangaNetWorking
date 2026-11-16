# TASK-110: Decomposição do Monólito de CatalogPage.tsx

## 1. Contexto & Problema
O arquivo `CatalogPage.tsx` continha 502 linhas agregando:
- Cabeçalho editorial e busca textual integrada.
- Eixo 1 de formato (desktop e mobile).
- Eixo 2 de gêneros com rolagem horizontal e expansão condicional.
- Drawer lateral de filtros avançados (status, público, ordenação, ilustrações).
- Estados assíncronos (skeleton loading, erro, vazio com ilustração).
- Grid de obras `WorkCard` com instrumentação analítica e favoritos.
- Convite de cold start para autores logados.
- Controles de paginação de catálogo no servidor.

## 2. Escopo da Solução
Decompor em componentes com responsabilidade única sob `src/components/catalog/`:
1. `CatalogHeaderSection.tsx`: Cabeçalho editorial, busca com debounce e seletor primário de formato.
2. `CatalogGenreFilterBar.tsx`: Barra sticky com chips de gênero, alternador mobile e botão de abertura do drawer com contador.
3. `CatalogFilterDrawer.tsx`: Drawer modal lateral com filtros avançados e botões de ação com suporte a Escape.
4. `CatalogWorksGrid.tsx`: Pílulas de filtros ativos, grid de cards, banners de cold start e paginação.
5. Reescrita de `CatalogPage.tsx` para < 100 linhas atuando estritamente como orquestrador.

## 3. Critérios de Aceite
- [x] Extração dos 4 submódulos sob `src/components/catalog/`.
- [x] Redução de `CatalogPage.tsx` de 502 para 97 linhas.
- [x] Preservação de 100% dos filtros na URL, persistência no F5 e acessibilidade.
- [x] Validação com `npm run build` (0 erros).

Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
