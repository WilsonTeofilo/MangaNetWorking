# Provisionamento e deploy em produção (Oracle Ampere A1) — itens 51, 52 e 14.1/14.3

> **Estado:** preparação concluída; **nenhuma VM, regra de firewall ou serviço foi criado**.
> O que falta depende de acesso externo (conta Oracle, shape elegível, chave SSH, IP liberado).

## 1. Pré-requisitos externos (bloqueadores)

| Item | Responsável | Estado |
|---|---|---|
| Acesso à conta Oracle Cloud | decisor de infra | ⛔ não iniciado |
| Região/shape Ampere A1 elegível e disponível | decisor de infra | ⛔ não verificado |
| Chave pública SSH autorizada | responsável técnico | ⛔ pendente |
| Confirmação do IP de origem e regras de rede | decisor de infra | ⛔ pendente |
| Domínio com DNS e TLS válido | responsável de produto | ⛔ pendente |
| Credenciais do provedor de e-mail e do Mercado Pago | decisor comercial | ⛔ pendente |

## 2. Regras de rede do host (aplicar no provisionamento)

- Liberar **apenas** 22 (SSH), 80 e 443 (HTTP/HTTPS conforme proxy TLS).
- **Não** expor Postgres (25432/5432), Mongo (27017), Redis (6379) nem o Actuator do backend.
- HTTPS definido **antes** de receber credenciais ou sessões reais.
- O Compose de produção já mantém Postgres, Mongo e Redis apenas na rede interna.

## 3. Preparação do host

```bash
# Ubuntu 22.04 (ARM64)
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # reconectar o shell depois
mkdir -p /opt/manganetworking && cd /opt/manganetworking
# copiar o repositório (clone do Git) e o .env de produção FORA do repositório:
sudo install -m 600 /dev/null /etc/manganetworking.env
sudo vi /etc/manganetworking.env   # copiar de ops/deploy/env.production.example
```

Regras do `.env`:

- fora do repositório, permissão `600`, dono do usuário de deploy;
- segredos distintos: `AES_SECRET_KEY` (32 bytes base64), `OTP_HMAC_SECRET`, `EMAIL_WEBHOOK_SECRET`, `METRICS_SCRAPE_TOKEN` (≥32 caracteres cada);
- `PUBLIC_FRONTEND_URL` em HTTPS, sem path/query/fragment;
- `MERCADOPAGO_BACK_URL_BASE` e `CORS_ALLOWED_ORIGINS` derivados da origem pública.

## 4. Validação antes do deploy

```powershell
.\ops\deploy\deploy-prod.ps1 -EnvFile C:\ProgramData\MangaNetWorking\secrets\.env
```

O script (modo validação) confere, **sem imprimir valores**:

1. presença e formato das variáveis obrigatórias (inclusive AES de 32 bytes e segredos ≥32 caracteres);
2. `docker compose -f docker-compose.prod.yml config --quiet`;
3. presença do texto oficial da Política de Privacidade (`PRIVACY_POLICY_DOCUMENT`);
4. presença da configuração renderizada do canal de plantão;
5. presença do último artefato de backup cifrado (`BACKUP_ARTIFACT`).

Ele recusa continuar se o `.env` estiver dentro do repositório.

## 5. Deploy

```powershell
.\ops\deploy\deploy-prod.ps1 -EnvFile C:\ProgramData\MangaNetWorking\secrets\.env -Apply
```

Sequência do `-Apply`: `docker compose up -d --build` → healthchecks (até 180 s) → leitura da
versão do Flyway nos logs → smoke E2E contra a stack implantada.

## 6. Critérios de aceite do deploy

- [ ] `GET /actuator/health` responde `UP` no host.
- [ ] Flyway aplicou **V1..V16** (`now at version v16`) sem erro de `validate`.
- [ ] Smoke E2E 12/12 na stack implantada (cadastro, 2FA, sessão, step-up PIX, upload, obra,
      capítulo, rota financeira 410, exportação e exclusão com 401 após revogação).
- [ ] `/api/legal/privacy-policy` responde `200` com o texto oficial aprovado.
- [ ] Prometheus coleta `/actuator/prometheus` com `Authorization: Bearer` e as regras estão ativas.
- [ ] Canal de plantão entrega o alerta de teste no e-mail institucional.
- [ ] Backup cifrado do dia existe e a verificação de restauração roda em banco isolado.
- [ ] `docker compose down -v` **não** foi usado em nenhum passo.

## 7. O que não foi feito (e por quê)

- Nenhuma VM, regra de firewall, DNS,TLS ou conta foi criada: depende de credenciais e decisão externas.
- Nenhuma migration foi aplicada em banco Oracle, nenhum backup de produção foi testado,
  nenhuma compra real ou ativação financeira de produção foi executada.
- A chave AES de produção **não** foi gerada nem armazenada aqui: ela nasce no cofre/KMS.
