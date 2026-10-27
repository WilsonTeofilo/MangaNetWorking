---
version: 2026-10-v1
effectiveDate: 2026-10-01
approvedBy: Encarregado de Protecao de Dados (DPO) & Diretoria MangaNetWorking
approvalReference: ATA-DIR-LGPD-2026-001
---

# Política de Privacidade e Proteção de Dados Pessoais — MangaNetWorking

**Versão:** 2026-10-v1  
**Data de Vigência:** 01 de outubro de 2026  
**Encarregado de Dados (DPO):** Dr. Hermes Silva — Gabinete de Governança e Privacidade  
**Canal Oficial de Contato:** `privacidade@manganetworking.com`

---

## 1. Compromisso Institucional com a Privacidade
A **MangaNetWorking** preza pela transparência, privacidade e segurança dos dados de seus usuários (leitores, autores independentes e moderadores), atuando em estrita observância à Lei Geral de Proteção de Dados Pessoais (**LGPD — Lei nº 13.709/2018**), ao Marco Civil da Internet (**Lei nº 12.965/2014**) e às diretrizes da Autoridade Nacional de Proteção de Dados (**ANPD**).

---

## 2. Dados Tratados, Finalidades e Bases Legais

| Categoria de Dados | Finalidade | Base Legal (LGPD) | Período de Retenção |
|---|---|---|---|
| **Cadastro de Usuário** (Nome, E-mail, Username, Senha com Hash Argon2/BCrypt) | Criação e autenticação de contas, envio de OTP/2FA e recuperação de acesso. | Execução de Contrato (Art. 7º, V) | Durante o ciclo de vida da conta + 5 anos após encerramento (Código Civil, art. 206). |
| **Identidade Fiscal de Criadores** (CPF e Chave Pix cifrados via AES-256-GCM) | Repasse de doações financeiras, assinaturas de membros e retenção contábil. | Obrigação Legal / Fiscal (Art. 7º, II; CTN, art. 173) | 5 anos fiscais a contar do primeiro dia do exercício seguinte. |
| **Registros de Consentimento e Auditoria** | Prova formal de consentimento, termos aceitos e solicitações de titulares. | Obrigação Legal (Art. 7º, II e Art. 8º, § 2º) | 5 anos em tabelas append-only imutáveis. |
| **Telemetria de Leitura e Métricas** | Marcador de leitura, preferências de capítulos e estatísticas de engajamento do autor. | Legítimo Interesse (Art. 7º, IX) | 12 meses em dados agregados desvinculados de identidade direta. |
| **Registros de Conexão (IP, Porta, Data/Hora)** | Prevenção a fraudes, rate limiting e guarda de registros de acesso. | Obrigação Legal (Marco Civil da Internet, Art. 15) | 6 meses estritos. |

---

## 3. Segurança dos Dados e Criptografia em Repouso
* **Criptografia Forte:** Dados altamente sensíveis de criadores (CPF e Chave PIX) e tokens de segurança 2FA são protegidos em repouso por meio do algoritmo **AES-256-GCM** com vetor de inicialização (IV) aleatório de 12 bytes e autenticação de integridade de 128 bits.
* **Segurança de Sessão:** Sessões ativas são emitidas exclusivamente através de cookies seguros (`HttpOnly`, `SameSite=Strict`, `Secure`), impedindo ataques de Cross-Site Scripting (XSS).
* **Prevenção a Ataques de Força Bruta:** Implementado Rate Limiting distribuído no Redis para rotas de autenticação, comentários e emissão de códigos OTP.

---

## 4. Direitos do Titular (Art. 18 da LGPD)
O titular dos dados tem o direito de solicitar a qualquer momento, de forma facilitada e gratuita:
1. **Confirmação e Acesso:** Obtenção de cópia integral dos seus dados via exportação padronizada (`GET /api/users/me/export`).
2. **Correção:** Atualização de dados incompletos ou inexatos diretamente em seu perfil.
3. **Anonimização e Exclusão:** Exclusão definitiva de conta (`DELETE /api/users/me`), com desassociação imediata de obras, revogação instantânea de sessões e expurgo de dados identificadores.
4. **Revogação de Consentimento:** A qualquer momento, através das configurações de privacidade na plataforma.

---

## 5. Canal de Atendimento do Encarregado (DPO)
Para exercer seus direitos ou esclarecer quaisquer dúvidas sobre o tratamento de seus dados pessoais, o titular pode contatar nosso Encarregado de Proteção de Dados:
* **E-mail:** `privacidade@manganetworking.com`
* **Prazo de Resposta:** Até **15 (quinze) dias corridos**, conforme preconiza o Art. 19, II da LGPD.
* **Endereço Postal:** Av. Paulista, 1000 - Bela Vista, São Paulo - SP, Brasil.
