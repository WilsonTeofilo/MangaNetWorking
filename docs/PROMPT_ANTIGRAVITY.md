# Prompt de execução — MangaNetWorking (Anti Gravity)

Você vai trabalhar no projeto `D:\Projetos\MangaNetWorking`. Antes de alterar qualquer arquivo, leia este prompt e o `README.md` inteiro. Em seguida, inspecione o repositório e confirme o estado real do backend, frontend, Docker Compose e documentação.

## Missão e Limites

- **ESCOPO 100% DIGITAL:** Não existe loja física, print-on-demand (POD), estoque, entrega ou despacho. A monetização é estritamente digital: doações, membros e anúncios, com taxa de 17% retida pela plataforma e 83% repassado ao autor.
- **TOLERÂNCIA ZERO PARA PIRATARIA:** Proibido upar obras de outros autores (ex: Bleach/Tite Kubo, Naruto/Masashi Kishimoto, Dragon Ball, One Piece, etc.), raws, scans ou traduções não autorizadas. Aplicação de punições: suspensão da obra e conta na 1ª infração; banimento permanente e irreversível (com retenção de logs para o Art. 184 do Código Penal) em caso de reincidência.
- **PROIBIÇÃO DE HENTAI E PORNOGRAFIA:** Proibição de pornografia explícita e hentai. Tolerância zero absoluta para CSAM (abuso de menores), com reporte imediato à Polícia Federal e Ministério Público.
- **CONFORMIDADE COM A LGPD (Lei 13.709/2018):** Minimização de dados, proteção e criptografia de CPF e chave PIX (AES-256), DTOs públicos sem vazamento de dados sensíveis, garantia dos direitos dos titulares (Art. 18) e canal de DPO/privacidade.
- **GAMIFICAÇÃO DE SEASONS E MISSÕES PARA CRIADORES:**
  - Temporadas de 60 dias com missões simples e fáceis de programar (consistência de novos capítulos, respostas a comentários de leitores, taxa de retenção de leitura).
  - Nível 1: Leve foco no feed (Boost de Descoberta por 24 horas) ao completar perfil + chave PIX + 1º capítulo.
  - Nível 2: Boost de 48h no feed + Badge cosmético de "Criador da Temporada".
  - Nível 3: Boost de 72h no feed + Rotação garantida no Banner Hero principal por 7 dias.
  - Nível 4: Redução temporária da taxa da plataforma de 17% para 10% durante 15 dias (autor recebe 90% das doações).

## Arquitetura e Engenharia

- Backend: Java 21, Spring Boot 3.4.2, Clean Architecture (DDD Lite), Spring Security, BCrypt, 2FA obrigatório (inclusive após Google), Dev Outbox local.
- Banco de Dados: PostgreSQL 16 (porta 25432) com Flyway; MongoDB 7 (porta 27017) para telemetria de leitura e projeções de feed.
- Storage: `LocalFileStorageService` no filesystem local (`./data/uploads/`) com validação de magic bytes, sanitização contra path traversal e allow-list de extensões (JPEG, PNG, WebP).
- Frontend: React 19, TypeScript, Vite (porta 5180), Tailwind CSS v4, Design System oficial "Banca de Rua / Fliperama do Mangá Independente" (ADR-005, IDENTIDADE_VISUAL.md).
- Docker: Isolamento estrito de portas e volumes no compose (`manganetworking`), sem conflitos com o projeto Peditto do usuário.
