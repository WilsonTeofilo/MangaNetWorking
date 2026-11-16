# TASK-103: Configuração de Suíte de Testes com Vitest e Testes de Domínio

## 1. Contexto & Problema
O frontend do MangaNetWorking não possuía uma suíte de testes unitários automatizados para validar regras de negócio, serialização de filtros de catálogo e mapeadores de API.

## 2. Escopo da Solução
1. Instalar e configurar `vitest` e `jsdom` (`vitest.config.ts`, script `npm test`).
2. Criar testes automatizados para:
   - `src/utils/__tests__/catalogFilters.test.ts` (parse, write, pílulas ativas e remoção de filtros).
   - `src/utils/__tests__/apiMappers.test.ts` (parsing defensivo de JSON de páginas e mapeamento de resumos).

## 3. Critérios de Aceite
- [x] Script `npm test` configurado e funcional.
- [x] Testes passando com 100% de sucesso no ambiente Vitest.

Assinado por: Hermes (Tech Lead / Gerente / Arquiteto)
