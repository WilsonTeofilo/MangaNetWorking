# MangaNetWorking

Plataforma editorial digital para conectar leitores e criadores de histórias autorais. O catálogo e o leitor suportam mangás em páginas e light novels em capítulos de prosa, com renderização apropriada para cada formato.

## Como navegar na documentação

- `AGENTS.md`: regras do fluxo único de trabalho.
- `docs/orquestracao/ROADMAP-FASES.md`: fase atual, estado real e fila única de tarefas.
- `docs/orquestracao/AUDITORIA-ATUAL.md`: problemas abertos e severidade.
- `docs/orquestracao/EMAIL-E-2FA.md`: plano de e-mail, OTP e Google OAuth.
- `docs/orquestracao/PROTOCOLO_ORQUESTRACAO.md`: regras operacionais.
- `docs/skills/`: procedimentos reutilizáveis por tipo de tarefa. Para UI, use `docs/skills/frontend-design/SKILL.md`.
- `docs/IDENTIDADE_VISUAL.md`: especificação visual detalhada (referência da skill de frontend).
- `docs/PLANO_DE_FASES.md`: visão de produto e regras de negócio.
- `docs/decisions/`: decisões arquiteturais aprovadas.

**O roadmap explica o estado; as skills explicam como executar.** O README é uma porta de entrada, não a prova de que um requisito já está implementado.

> ⚠️ **ESCOPO ESTATUTÁRIO FUNDAMENTAL:**
> - **NÃO EXISTE LOJA NEM VENDA DE OBRAS/PRODUTOS:** A plataforma é **100% digital e editorial**. Não há venda individual de mangás/capítulos, roupas ou outros produtos; sem vitrine, carrinho, print-on-demand (POD), estoque ou logística.
> - **MONETIZAÇÃO EXCLUSIVAMENTE DIGITAL:** Doações avulsas via PIX/Cartão, Assinaturas do Clube de Membros (`Membership`) e repasse de Anúncios no leitor (58% autor / 42% plataforma), com taxa justa de 17% retida pela plataforma para sustentar os servidores e 83% repassado diretamente ao criador.
> - **TOLERÂNCIA ZERO PARA PIRATARIA E CONTEÚDO ADULTO:** Proibido upar obras de terceiros (ex: Bleach/Tite Kubo, Naruto/Masashi Kishimoto) e proibido pornografia/hentai.

---

## 1. Objetivo e limites do produto

O MangaNetWorking é uma plataforma editorial digital para obras originais e autorais, em mangá ou light novel. O escopo é estritamente focado em:
1. Publicação e leitura digital de mangás em páginas e capítulos de light novel em prosa.
2. Algoritmo transparente de recomendação e descoberta orgânica para novos autores.
3. Gamificação de Criadores baseada em **Seasons (Temporadas de Missões)** para impulsionar engajamento e visibilidade.
4. Apoio financeiro direto e sem burocracia (Doações e Membros com 83% líquido para o autor).
5. Segurança ofensiva de ponta a ponta e conformidade irrestrita com a **LGPD (Lei Geral de Proteção de Dados — Lei 13.709/2018)**.

---

## 2. Política de Conteúdo, Anti-Pirataria e Regras de Convivência

### 2.1 Tolerância Zero para Pirataria (Violação de Direitos Autorais)
- **Obras Proibidas:** É estritamente proibido o upload, distribuição ou veiculação de mangás, quadrinhos, raws, scans ou traduções não autorizadas de terceiros (nacionais ou internacionais). Qualquer upload de obras comerciais protegidas (ex: obras de Tite Kubo, Masashi Kishimoto, Eiichiro Oda, estúdios ou editoras comerciais) será sumariamente interceptado e punido.
- **Graduação das Punições:**
  - **1ª Infração (Denúncia confirmada ou detecção):** Remoção imediata e definitiva da obra violadora + suspensão da conta por 15 a 30 dias + congelamento cautelar de quaisquer doações ou saldos gerados de forma ilícita.
  - **Reincidência ou Infração Dolosa Grave:** **Banimento permanente e irreversível** do criador (inclusão de CPF, hash de IP e chave PIX em blacklist definitiva da plataforma), além da preservação de todos os logs transacionais e de upload para colaboração jurídica nos termos do **Art. 184 do Código Penal Brasileiro** (Violação de Direito Autoral).

### 2.2 Proibição Absoluta de Conteúdo Adulto / Hentai / Pornografia
- É expressamente proibido qualquer conteúdo pornográfico explícito, hentai, cenas de sexo explícito, genitália exposta ou fetiches degradantes.
- Obras que contenham nudez não artística ou pornografia serão banidas sumariamente.
- **Tolerância Zero Absoluta para Abuso Infantil (CSAM):** Qualquer material envolvendo exploração sexual de menores ensejará banimento imediato, bloqueio de infraestrutura e encaminhamento compulsório dos dados às autoridades federais competentes (Polícia Federal e SaferNet).

### 2.3 Mecanismo de Denúncia e Takedown Ágil
- Leitores e detentores de direitos autorais contam com canal de denúncia com SLA de 24 horas para triagem e suspensão cautelar de obras suspeitas.

---

## 3. Conformidade Estrita com a LGPD (Lei 13.709/2018)

O MangaNetWorking trata a privacidade e os dados pessoais como requisitos fundamentais de arquitetura:

1. **Princípio da Minimização de Dados (Data Minimization):** Apenas os dados estritamente necessários para o funcionamento do serviço são coletados (e-mail, nome, senha com hash forte, chave PIX e CPF estritamente para repasses financeiros).
2. **Bases Legais Claras:**
   - *Consentimento:* Para exibição de bio, links sociais opcionais e biblioteca pública do leitor.
   - *Execução de Contrato (Art. 7º, V):* Para autenticação de sessão, 2FA obrigatório, processamento de doações e assinaturas.
   - *Cumprimento de Obrigação Legal e Regulatória (Art. 7º, II):* Para retenção fiscal e contábil de transações financeiras e logs de acesso a aplicações (Marco Civil da Internet, Art. 15).
3. **Direitos dos Titulares de Dados (Art. 18 da LGPD):**
   - Confirmação de tratamento e acesso aos dados.
   - Correção de dados incompletos ou inexatos.
   - Eliminação dos dados pessoais tratados com consentimento (direito ao esquecimento) e encerramento de conta, respeitados os prazos legais de retenção financeira.
   - Revogação de consentimento a qualquer momento com um clique.
4. **Proteção e Criptografia:**
   - CPF e Chaves PIX são armazenados com criptografia em repouso (AES-256) e nunca são expostos em endpoints públicos da API, DTOs de leitura ou logs de aplicação.
   - Senhas passam por hashing adaptativo irreversível com **BCrypt (fator 12)**.
   - Canal de Privacidade e Encarregado de Proteção de Dados (DPO): `privacidade@manganetworking.com.br`.

---

## 4. Gamificação de Criadores: Seasons e Sistema de Missões Dinâmicas

Para incentivar a produção contínua sem criar burocracias ou códigos excessivamente complexos, a plataforma implementa o sistema de **Seasons (Temporadas de 60 dias)** com missões acessíveis e recompensas transparentes calculadas no backend:

### 4.1 Níveis de Criador e Recompensas
- **Nível 1 (Estreante — Descoberta Inicial):**
  - *Como atingir:* Completar o perfil de autor (avatar + bio + chave PIX) e publicar o 1º capítulo autoral.
  - *Recompensa:* **Boost Leve de Descoberta no Feed por 24 horas**, garantindo que leitores que navegam pelas novidades vejam a obra recém-nascida.
- **Nível 2 (Em Ascensão — Consistência):**
  - *Como atingir:* Publicar ao menos 3 capítulos e atingir 100 leituras completas.
  - *Recompensa:* **Boost de 48 horas no Feed** + Badge cosmético de *"Criador da Temporada"* no card da obra e no perfil público.
- **Nível 3 (Destaque Editorial — Comunidade Ativa):**
  - *Como atingir:* Manter consistência quinzenal de lançamentos + responder a comentários de leitores dentro de 48h.
  - *Recompensa:* **Boost de 72 horas no Feed** + Rotação garantida no **Banner Hero Principal do Feed** por 7 dias + Notificação push/destaque para os seguidores da obra.
- **Nível 4 (Mestre da Temporada — Top Tier):**
  - *Como atingir:* Alta retenção de leitura (> 75% de páginas lidas por capítulo) e engajamento orgânico de apoiadores.
  - *Recompensa:* **Desconto de Desempenho na Taxa da Plataforma** (a taxa cai de 17% para **10%** durante 15 dias, repassando 90% das doações ao autor) + Destaque oficial no topo da lista de criadores da temporada.

### 4.2 Missões Semanais Fáceis de Programar e Verificar
As missões são baseadas em métricas nativas que o próprio backend já audita com precisão:
- **Missão Consistência:** Publicar 1 novo capítulo dentro do prazo semanal (+15% no score de descoberta por 48h).
- **Missão Diálogo:** Responder a pelo menos 5 comentários em suas obras nas primeiras 24h pós-lançamento (+10% de boost orgânico).
- **Missão Retenção:** Manter 65% de taxa de conclusão no capítulo mais recente.

---

## 5. Regras Financeiras e Divisão da Monetização (Split)

A plataforma **não vende mangás/capítulos individualmente nem possui loja física, estoque ou logística**. Os fluxos de receita previstos são digitais:
- **Doações Avulsas ao Criador:** o split projetado é 83% criador / 17% plataforma. O endpoint legado está desativado até existir Checkout Pro com pagamento confirmado; nenhum crédito é criado sem confirmação do gateway.
- **Clube de Membros (`Membership` do Criador):** faixas entre R$ 7,99 e R$ 45,99, com split projetado de 83% / 17% e acesso antecipado. A ativação está indisponível até receber fluxo de checkout idempotente equivalente ao VIP.
- **Acesso Antecipado (`Early Access`):** Capítulos liberados primeiro para membros pagantes com base no campo `publicReleaseAt`, controlado com código HTTP 403 no backend.
- **Anúncios no Leitor:** Exibição discreta a cada 30 páginas lidas, com participação de 58% para o criador e 42% para a plataforma.
- **Assinatura VIP / Premium da Plataforma (~R$ 23 / 30 dias):**
  - **Zero Anúncios:** Remove 100% da publicidade no leitor, feed e páginas da plataforma.
  - **Selo VIP e Cosméticos:** Badge exclusivo nos comentários e borda de perfil de apoiador.
  - **Leitura Offline no Futuro App Mobile:** Permite download de capítulos para leitura offline encapsulada e criptografada na sandbox do aplicativo (com flag nativa `FLAG_SECURE` para impedir print/gravação de tela e sem permitir extração de arquivos para o PC).
  - **Sem furar o criador:** O Premium da plataforma **NÃO dá acesso antecipado** aos capítulos exclusivos de membros (o leitor só baixa offline os capítulos que tem direito de ler).
  - **Zero loja:** Não há venda física, cupons ou descontos de loja.
  - **Estado de implementação:** o Checkout Pro cria uma preferência vinculada ao usuário e só ativa o VIP após webhook assinado, aprovado, em BRL e com valor conferido. A homologação Sandbox continua pendente de credenciais e URL pública de webhook.

---

## 6. Arquitetura de Software e Tecnologias

- **Backend:** Java 21, Spring Boot 3.4.2, Clean Architecture (DDD Lite), Spring Security, Flyway, BCrypt, 2FA Dev Outbox.
- **PostgreSQL 16 (Porta 25432):** Fonte da verdade relacional para identidade, credenciais, perfis, obras, capítulos, transações e auditoria.
- **MongoDB 7.0 (Porta 27017):** Armazenamento de telemetria de leitura em tempo real e cache de feed.
- **Armazenamento de Arquivos Local:** `LocalFileStorageService` (`./data/uploads/`) com validação de magic bytes, sanitização contra path traversal e allow-list de extensões.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4 (Porta 5180). Design System oficial "Banca de Rua / Fliperama do Mangá Independente" (ADR-005), com fontes self-hosted via `@fontsource` (Anton, Bowlby One, Archivo Variable e Silkscreen).
- **Docker Compose:** Projeto `manganetworking` com volumes e redes isoladas, sem conflito com o projeto Peditto.

---

## 7. Execução e Comandos

```powershell
# Subir infraestrutura Docker isolada
docker compose up -d

# Executar backend (Porta 8085)
# O profile "dev" habilita o Dev Outbox (GET /api/dev/outbox/latest) para ler o OTP 2FA
# localmente. Sem profile (ou com "prod") o endpoint não existe — o 2FA continua válido,
# apenas o atalho de leitura local fica indisponível. Nunca use "dev" em produção.
cd backend
$env:SPRING_PROFILES_ACTIVE = "dev"
cmd /c mvn spring-boot:run

# Executar frontend (Porta 5180)
cd frontend
cmd /c npm run dev
```
