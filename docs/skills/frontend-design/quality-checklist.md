# Quality checklist — frontend

Passe cada item antes de dizer que a tarefa visual terminou. Marque com honestidade; se depender de conteúdo real ou backend, diga que ficou pendente em vez de marcar como pronto.

## Identidade e composição

- [ ] Segue `visual-principles.md` e a seção de `docs/IDENTIDADE_VISUAL.md` da tela alterada.
- [ ] Hierarquia clara: dá para identificar conteúdo principal e ação primária de imediato.
- [ ] No máximo 1 CTA primário amarelo por tela; máx. 2 blocos amarelos grandes por viewport.
- [ ] Sem card dentro de card; raio ≤ 2px (exceto avatar/selo); sombra dura sem blur.
- [ ] Monoespaçada fora de metadados; pixel font só em microrrótulos ≥ 12px; acentos (`ã õ ç é ê â í ó ú`) renderizam.
- [ ] Componentes existentes reutilizados; nenhuma segunda versão local criada sem motivo.

## Estados e conteúdo

- [ ] Loading, vazio, erro e sucesso existem e são legíveis.
- [ ] Dados reais e placeholder estão claramente distinguidos (`data-placeholder="true"`).
- [ ] Título de obra em até 2 linhas com o nome completo acessível.
- [ ] Imagem quebrada/ausente cai no fallback do `<Cover>`, nunca num ícone de imagem quebrada.
- [ ] Conteúdo longo não quebra o layout.

## Acessibilidade

- [ ] Contraste ≥ 4.5:1 em texto normal e ≥ 3:1 em texto grande/UI.
- [ ] Texto mínimo 12px; alvos de toque ≥ 44×44px.
- [ ] Foco visível (`:focus-visible`, outline 3px + offset).
- [ ] Informação nunca só por cor; erro e estado de selo têm texto/rótulo.
- [ ] Navegação 100% por teclado, ordem de foco lógica.
- [ ] Elementos decorativos com `aria-hidden="true"`; capa com `alt` = título (ou `alt=""` quando decorativa).
- [ ] `prefers-reduced-motion` (e `prefers-contrast`) respeitados; marquee/animação contínua param.

## Responsividade e leitor

- [ ] Layout funciona em 360px, 768px e 1280px; header alinha no container único.
- [ ] Modo Leitor limpo: sem textura, mascote, adesivo ou fita; anúncio rotulado e sem salto de layout.
- [ ] Nenhum dado sensível (CPF/PIX) em tela pública, mock ou placeholder.

## Escopo e verificação

- [ ] Não alterei contrato de API, regra de negócio, permissionamento nem cálculo financeiro.
- [ ] Nenhuma arte/texto/logo de terceiros foi introduzido.
- [ ] `npm run build` passou.
- [ ] Reli o diff: nada fora do escopo, nada copiado de referência.
