# ADR-006: Modelo de Monetização VIP Global, Arquitetura de Reuso Mobile e Leitura Offline Segura

## Status
Aprovado

## Contexto
Durante o refinamento do modelo de negócio editorial do MangaNetWorking, surgiram duas dúvidas arquiteturais fundamentais:
1. **Ausência Absoluta de Loja Física:** Esclarecer de forma definitiva que a plataforma não vende produtos físicos, merchandising, impressos ou itens com desconto de loja.
2. **Reuso do Backend no Futuro App Mobile:** Verificar se o backend atual desenvolvido em Spring Boot 3 + PostgreSQL + MongoDB pode ser 100% reutilizado por um aplicativo móvel (Android/iOS) sem retrabalho de regras ou banco de dados.
3. **Proposta de Valor da Assinatura VIP / Premium da Plataforma:** Definir as vantagens da assinatura global sem canibalizar o Clube de Membros individual dos criadores independentes.

## Decisões

### 1. Separação Estrita de Receitas e Banimento de Loja Física
- **Zero Loja:** O MangaNetWorking é estritamente digital. Não existem produtos físicos, estoque, logística, frete, correios ou descontos em lojas.
- **Divisão Clara das Receitas:**
  - **Clube de Membros do Autor (Receita do Criador):** Faixas de R$ 7,99 a R$ 45,99 mensais. Repasse líquido de 83% ao autor e 17% à plataforma. **É a única modalidade que desbloqueia capítulos em Acesso Antecipado (Early Access) daquele autor específico.**
  - **Doações Diretas via PIX (Receita do Criador):** 83% para o criador, 17% retido pela plataforma.
  - **Anúncios no Leitor (Receita Mista):** 58% para o autor da obra lida e 42% para a plataforma.
  - **Assinatura VIP / Premium da Plataforma (Receita Global da Plataforma):** R$ 23 / 30 dias.

### 2. O que o VIP da Plataforma Oferece
- **Remoção de 100% dos anúncios:** Navegação limpa no feed, páginas e dentro do leitor, tanto na web quanto no app mobile.
- **Selo / Badge Cosmético VIP:** Destaque estético em comentários e no perfil do leitor.
- **Habilitação de Leitura Offline no App Mobile:** Permissão para salvar capítulos localmente no dispositivo para leitura sem conexão de internet (recurso da Fase 7).
- **Proteção ao Criador:** A assinatura VIP **NÃO dá acesso antecipado** aos capítulos fechados de membros de autores. O leitor só tem acesso antecipado se for membro do autor.

### 3. Arquitetura Desacoplada e Reuso 100% no Mobile
- O backend em Spring Boot 3 com Clean Architecture é uma **API REST stateless pura**, comunicando-se exclusivamente via JSON e autenticação Bearer Token / JWT.
- **Reuso Total:** O mesmo servidor (`http://localhost:8085` em dev ou domínio em produção) e o mesmo banco relacional (PostgreSQL) e documental (MongoDB) atenderão simultaneamente o Frontend Web (React 19) e o futuro App Mobile (React Native / Flutter / Kotlin / Swift).
- Nenhum código de backend precisará ser reescrito quando a versão mobile for iniciada.

### 4. Segurança Anti-Pirataria e DRM na Leitura Offline (Mobile)
Para viabilizar a leitura offline no aplicativo sem risco de vazamento de capítulos ou pirataria de obras independentes:
1. **Armazenamento Encapsulado na Sandbox:** Os capítulos baixados ficam armazenados no diretório privado do aplicativo (armazenamento interno seguro), inacessível por gerenciadores de arquivos comuns, conexão USB ou computadores externos.
2. **Criptografia em Repouso:** Os arquivos das páginas são salvos com criptografia simétrica local vinculada à chave da sessão do usuário.
3. **Bloqueio de Prints e Gravação de Tela (`FLAG_SECURE`):**
   - No Android: a Activity do leitor ativa nativamente `window.setFlags(FLAG_SECURE, FLAG_SECURE)`, fazendo com que capturas de tela e aplicativos de gravação de tela capturem apenas uma tela preta.
   - No iOS: proteção na visualização de tela contra gravação via AirPlay e screenshots do sistema.
4. **Respeito aos Direitos de Acesso:** O aplicativo só permite download offline de capítulos públicos ou de obras cujos criadores o usuário apoia ativamente como membro.

## Consequências
- A experiência do usuário ganha valor tangível (ler offline no metrô/ônibus sem gastar pacote de dados móveis).
- Os autores continuam 100% protegidos contra pirataria e vazamentos.
- A arquitetura do sistema permanece limpa, desacoplada e pronta para expansão mobile.
