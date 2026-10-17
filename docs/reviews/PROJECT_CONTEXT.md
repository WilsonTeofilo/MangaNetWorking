# Contexto do projeto — MangaNetWorking

## Produto

MangaNetWorking é uma plataforma editorial **digital** para publicação, leitura e descoberta de mangás e quadrinhos originais independentes. O produto conecta leitores e criadores e oferece apoio financeiro digital. Não é uma loja nem uma plataforma de distribuição de obras de terceiros.

## Objetivos de produto

- Facilitar publicação e leitura digital, com foco no formato vertical/scroll.
- Ajudar leitores a descobrir criadores independentes por feed, catálogo e recomendações.
- Dar aos criadores ferramentas editoriais, comunidade, missões e transparência de ganhos.
- Proteger leitores, criadores, conteúdo autoral e dados pessoais.

## Arquitetura observada

- **Backend:** Java 21, Spring Boot 3.4.x, camadas de controller/application service/domain/repository, Spring Security e Flyway.
- **Relacional:** PostgreSQL para identidade, catálogo, permissões e transações.
- **Documental:** MongoDB para progresso/telemetria de leitura e projeção do feed.
- **Arquivos:** `FileStorageService`; implementação local em `./data/uploads/` para desenvolvimento. O banco guarda referências e metadados, não os binários.
- **Frontend:** React 19, TypeScript, Vite e Tailwind CSS v4.
- Portas de desenvolvimento documentadas: API 8085, Vite 5180, PostgreSQL 25432 e MongoDB 27017; confirme configurações reais antes de alterar.

## Fontes de verdade

1. Código, migrações e testes determinam o comportamento que existe hoje.
2. ADRs em `docs/decisions/` determinam decisões arquiteturais aprovadas; se uma decisão precisar mudar, proponha/registre ADR em vez de contradizê-la silenciosamente.
3. `docs/reviews/BUSINESS_RULES.md` e `SECURITY_REQUIREMENTS.md` registram requisitos do produto, não prova de que estejam implementados.
4. `docs/PLANO_DE_FASES.md` é o roadmap e deve refletir evidências atuais, sem declarar conclusão com base em intenção.
5. `README.md` é a porta de entrada curta; detalhes vivem nos reviews, ADRs, plano e especificações.

## Regras para retomar trabalho

- Inspecione `git status` e os diffs antes de editar; o usuário pode ter trabalho local não commitado.
- Leia o estado do handoff em `IMPLEMENTATION_STATUS.md` e revalide se necessário. Resultado antigo de build/teste não garante o estado atual.
- Não confunda UI com autorização: permissões, propriedade, dinheiro, moderação e acesso a conteúdo são validados no servidor.
- Não assuma que promessa em documento está implementada. Verifique fluxo completo, autorização, persistência, erros e testes.
- Para trabalho visual, selecione a skill de frontend design; mantenha contexto geral aqui e passos específicos na skill.
