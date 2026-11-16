# TASK-113: Decomposição Modular do Cabeçalho da Aplicação (Header.tsx)

## 1. Contexto & Problema
O componente `Header.tsx` continha 407 linhas, unindo a barra desktop, a barra mobile inferior, dropdown de perfil do usuário, controles de moderação e crachás de status.

## 2. Escopo da Solução
Decompor em componentes sob `src/components/layout/header/`:
- `HeaderBrand.tsx`: Logo símbolo oficial e link de retorno ao feed.
- `HeaderNav.tsx`: Barra de navegação central desktop (Feed, Catálogo, Sobre, Biblioteca com contagem).
- `HeaderUserMenu.tsx`: Menu dropdown do usuário autenticado (ações de criador, leitor, moderação, VIP e logout) e botão de login.
- `HeaderMobileNav.tsx`: Barra inferior fixa para navegação rápida mobile.
- `Header.tsx`: Reduzido de 407 para 79 linhas atuando como orquestrador limpo.

## 3. Critérios de Aceite
- [x] Extração de 4 módulos especialistas em `components/layout/header/`.
- [x] Redução de `Header.tsx` para 79 linhas.
- [x] TypeScript build validado com 0 erros.

Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
