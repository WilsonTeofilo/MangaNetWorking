# TASK-105 — Decomposição Modular e Despoluição de CreatorWorksPage (Anti-Monólito)

**Status:** Especificada pelo Tech Lead Hermes  
**Executor:** OpenCode Frontend Worker  
**Escopo:** `frontend/src/pages/CreatorWorksPage.tsx` e `frontend/src/components/creator/works/`  

---

## 1. Contexto e Diagnóstico

`CreatorWorksPage.tsx` acumulou 538 linhas em um único arquivo, misturando:
1. Estado e sincronização de listagem de obras com a API (`workApi.listMyWorks`).
2. Filtragem local e normalização de busca por título.
3. Máquina de estado do formulário de criação/edição (título, sinopse com contador, categorias, formato Mangá/Novel, status).
4. Upload e recorte de capa (2:3) e banner (16:9) com `ImageCropper`.
5. Apresentação visual da grade de obras, formulário expansível e modais de corte.
6. Hardcoded hex residual: `shadow-[4px_4px_0_#0B0B0C]` na linha 231 (deve usar `var(--mn-ink)`).

**Objetivo:** Decompor `CreatorWorksPage.tsx` no mesmo padrão de excelência de `CreatorWorkspacePage.tsx` (TASK-100), reduzindo a página orquestradora para menos de 120 linhas.

---

## 2. Arquitetura Modular Proposta

Criar o diretório: `frontend/src/components/creator/works/` com os seguintes módulos:

### 1. `useCreatorWorks.ts`
- Hook customizado que isola:
  - Estado da lista de obras: `works`, `loading`, `error`, `message`, `query`, `setQuery`, `filteredWorks`.
  - Estado do formulário: `editingId`, `title`, `setTitle`, `synopsis`, `setSynopsis`, `genres`, `setGenres`, `format`, `setFormat`, `cover`, `setCover`, `banner`, `setBanner`, `status`, `setStatus`, `declared`, `setDeclared`, `saving`, `formOpen`, `setFormOpen`.
  - Estado de crop: `cropTarget`, `setCropTarget`, `cropFile`, `setCropFile`, `cropUrl`, `setCropUrl`.
  - Operações: `loadWorks`, `startEditing`, `resetForm`, `save`, `remove`, `uploadCover`, `uploadBanner`.
  - Tratamento estrito de erros com `catch (err: unknown)` e mensagens amigáveis ao usuário.

### 2. `CreatorWorksList.tsx`
- Componente puro focado na listagem do catálogo do autor:
  - Título da seção ("Seu catálogo").
  - Campo de busca por título (apenas se houver obras).
  - Botão de ação "+ LANÇAR NOVA OBRA" com estilo do Design System (substituir `#0B0B0C` por `var(--mn-ink)`).
  - Estados de lista: `loading`, vazio e sem resultados na busca.
  - Grade de cards de obras com capa, metadados (capítulos, views, curtidas, favoritos), status e botões "CONFIGURAR" e "REMOVER".

### 3. `CreatorWorkForm.tsx`
- Componente puro do formulário de criação/edição:
  - Título ("Lançar nova obra" / "Configurar obra") e botões "CANCELAR EDIÇÃO" / "FECHAR".
  - Campo de Título.
  - Campo de Sinopse (100 a 500 caracteres, contador dinâmico).
  - Seleção de Categorias com chips acessíveis (`aria-pressed`).
  - Toggle de Formato (MANGÁ / LIGHT NOVEL).
  - Seletor de Estado da Obra (em lançamento, rascunho, concluída) quando em edição.
  - Caixas de upload e reajuste da Capa (2:3) e Banner (16:9).
  - Checkbox de declaração de autoria original.
  - Exibição de alertas de erro e sucesso.
  - Botão de submit primário com estado de carregamento (`saving`).

### 4. `CreatorWorksPage.tsx` (Orquestrador)
- Fica responsável apenas por:
  - Renderizar o header explicativo ("Minhas obras").
  - Consumir o hook `useCreatorWorks`.
  - Renderizar `CreatorWorksList`.
  - Renderizar condicionalmente `CreatorWorkForm` quando `formOpen === true`.
  - Renderizar condicionalmente `ImageCropper` quando houver imagem em processo de corte.
  - **Meta:** menos de 120 linhas totais.

---

## 3. Critérios de Aceite

- [ ] `CreatorWorksPage.tsx` reduzido para < 120 linhas, sem lógica de formulário ou chamadas diretas de API.
- [ ] Criação dos arquivos em `frontend/src/components/creator/works/`:
  - `useCreatorWorks.ts`
  - `CreatorWorksList.tsx`
  - `CreatorWorkForm.tsx`
- [ ] Eliminação de qualquer cor hexadecimal solta (substituir `#0B0B0C` por `var(--mn-ink)`).
- [ ] Manter 100% da compatibilidade funcional (lançar obra, editar, excluir, buscar, crop 2:3 capa, crop 16:9 banner).
- [ ] Zero uso de `any` em tipagens ou capturas de exceção (`catch (err: unknown)`).
- [ ] Build do Frontend passando limpo: `Set-Location D:\Projetos\MangaNetWorking\frontend; npm.cmd run build` (0 erros de TypeScript).
- [ ] Relatório de entrega publicado em `docs/orquestracao/frontend/relatorios/RELATORIO-TASK-105.md`.

---
Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
