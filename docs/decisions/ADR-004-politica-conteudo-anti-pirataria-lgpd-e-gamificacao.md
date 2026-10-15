# ADR-004: Política de Conteúdo, Anti-Pirataria, Conformidade com a LGPD e Gamificação por Seasons

- **Status:** Aceito
- **Data:** 2026-10-15
- **Decisores:** Time de Engenharia e Arquitetura MangaNetWorking
- **Contexto:** 
  O MangaNetWorking é uma plataforma estritamente editorial e digital para quadrinistas independentes. Ficou decidido que a plataforma **não possui loja física, nem print-on-demand (POD), nem vitrine de mercadorias**. Foi demandada a formalização de diretrizes rígidas contra pirataria e pornografia, adequação completa à Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) e a definição de um sistema de gamificação de autores baseado em **Seasons (Temporadas)** com missões de execução simples e recompensas atrativas.

---

## 1. Decisão: Escopo 100% Digital e Ausência de Loja Física

1. **Eliminação de Loja/Vitrine de Produtos:** A plataforma não comercializa produtos físicos, não faz print-on-demand, não gerencia estoque, etiquetas de envio, frete ou logística de correios.
2. **Monetização Focada:** A sustentação financeira da plataforma e dos criadores reside unicamente em:
   - Doações avulsas via PIX/Cartão (83% criador / 17% plataforma).
   - Assinaturas de Membros do Clube do Criador (`Membership`) de R$ 7,99 a R$ 45,99 (83% criador / 17% plataforma).
   - Anúncios exibidos a cada 30 páginas de leitura (58% criador monetizado / 42% plataforma).

---

## 2. Decisão: Política Anti-Pirataria e Tolerância Zero a Conteúdo Adulto

### 2.1 Anti-Pirataria
- **Proibição:** É estritamente proibido o upload de obras de terceiros, scans, raws, fan-translations ou cópias de mangás e quadrinhos já existentes (ex: mangás de editoras comerciais como Shueisha, Shogakukan, Kodansha ou obras de autores como Tite Kubo, Masashi Kishimoto, Eiichiro Oda, etc.).
- **Punições Server-Side:**
  - **1ª Violação:** Remoção cautelar imediata da obra + suspensão da conta por 15 a 30 dias + congelamento de saques financeiros originados de forma ilícita.
  - **Reincidência:** Banimento permanente (blacklist de CPF, IP e chave PIX) + preservação imutável de logs para colaboração com as autoridades judiciais nos termos do **Art. 184 do Código Penal Brasileiro**.

### 2.2 Proibição de Conteúdo Pornográfico / Hentai
- Proibição absoluta de conteúdo pornográfico explícito, genitália exposta ou atos sexuais explícitos (hentai).
- Tolerância zero absoluta para Exploração e Abuso Sexual Infantil (CSAM), acarretando banimento sumário imediato e comunicação compulsória à Polícia Federal e ao Ministério Público.

### 2.3 Mecanismo de Takedown
- Endpoint e formulário de denúncia (`/api/reports`) acessível publicamente para que leitores e detentores de direitos notifiquem a plataforma, com SLA de moderação de até 24 horas.

---

## 3. Decisão: Conformidade com a LGPD (Lei 13.709/2018)

1. **Data Minimization:** Coleta apenas de dados indispensáveis à prestação dos serviços editoriais e financeiros.
2. **Bases Legais (Art. 7º):**
   - *Consentimento (Art. 7º, I):* Para dados públicos opcionais (bio, redes sociais).
   - *Execução de Contrato (Art. 7º, V):* Para autenticação 2FA, processamento de doações e repasses aos criadores.
   - *Obrigação Legal e Regulatória (Art. 7º, II):* Para retenção contábil e fiscal de transações financeiras e registros de acesso à internet (Marco Civil da Internet, Art. 15).
3. **Direitos dos Titulares (Art. 18):**
   - Disponibilização de endpoint para consulta e download dos próprios dados em formato estruturado (JSON).
   - Endpoint para exclusão e anonimização de conta ("direito ao esquecimento"), resguardados os prazos legais de retenção contábil do ledger financeiro.
4. **Proteção Criptográfica:**
   - CPF e chaves PIX são armazenados criptografados com **AES-256-GCM** em repouso.
   - Nenhum DTO público ou log de console/arquivo expõe CPF, chaves PIX ou senhas.

---

## 4. Decisão: Gamificação por Seasons e Sistema de Níveis de Criador

Para manter a plataforma dinâmica, gamificada e simples de programar sem sobrecarregar a arquitetura, implementa-se o sistema de **Seasons (Temporadas de 60 dias)**:

### 4.1 Níveis e Recompensas
- **Nível 1 (Estreante):**
  - *Requisitos:* Completar perfil com avatar, bio, chave PIX e publicar o 1º capítulo.
  - *Recompensa:* **Boost de Descoberta Leve por 24 horas no Feed** para impulsionar a obra recém-lançada.
- **Nível 2 (Em Ascensão):**
  - *Requisitos:* Publicar ao menos 3 capítulos e atingir 100 leituras completas.
  - *Recompensa:* **Boost de 48 horas no Feed** + Badge cosmético de *"Criador da Temporada"* no card da obra e no perfil público.
- **Nível 3 (Destaque Editorial):**
  - *Requisitos:* Manter consistência quinzenal de publicação + responder a comentários de leitores dentro de 48h.
  - *Recompensa:* **Boost de 72 horas no Feed** + Inclusão prioritária no **Banner Hero Rotativo do Feed** por 7 dias.
- **Nível 4 (Mestre da Temporada):**
  - *Requisitos:* Taxa de retenção de leitura superior a 75% e engajamento orgânico consistente.
  - *Recompensa:* **Redução temporária da taxa da plataforma de 17% para 10%** por 15 dias (o autor recebe 90% líquido das doações nesse período) + Pin de destaque na barra de autores.

### 4.2 Missões Semanais
Calculadas em tempo real pelo backend a partir de eventos já auditados:
- Lançamento semanal de capítulo (+15% no score algorítmico por 48h).
- Resposta a 5 comentários de leitores (+10% de boost orgânico).
- Retenção média superior a 65% das páginas do capítulo.

---

## Consequências e Benefícios
- **Clareza de Produto:** Fim de qualquer ambiguidade sobre loja de produtos físicos ou impressos.
- **Segurança Jurídica:** Proteção contra pirataria, bloqueio a conteúdos ilícitos e total aderência à legislação brasileira de direitos autorais e privacidade de dados (LGPD).
- **Engajamento Sustentável:** Autores são incentivados por recompensas reais de visibilidade e taxas reduzidas, sem exigir implementações complexas ou frágeis no código.
