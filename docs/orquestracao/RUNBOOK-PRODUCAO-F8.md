# Runbook de produção — F8

Este runbook descreve procedimentos que ainda precisam ser homologados no provedor de produção. Não execute restauração sobre produção sem janela aprovada, backup recente e responsável acompanhando.

## Backup e restauração

- O operador executa `ops/backup-restore.ps1 -Mode Backup -BackupPath <novo-diretório> -ComposeFile docker-compose.prod.yml` (ou `docker-compose.yml` para dev) com Docker Compose disponível. O destino precisa ser novo; dumps Postgres/Mongo e uploads são copiados sem imprimir credenciais, e `manifest.json` guarda SHA-256.
- Preserve cópias cifradas fora do host de produção, aplique controle de acesso e retenção aprovados e monitore a conclusão. O script não cifra em repouso nem envia para armazenamento externo: isso deve ser provido por um cofre/bucket com KMS e política de retenção.
- Para ensaio não destrutivo, use `-Mode RestoreCheck -BackupPath <diretório> -ComposeFile docker-compose.prod.yml`. O script confere checksums e restaura bancos com nomes de staging; os uploads são copiados para uma pasta `restore-check-*`. Ele não apaga automaticamente o staging, para permitir inspeção e limpeza manual após aprovação.
- Nunca use `docker compose down -v` como procedimento de backup ou recuperação.
- Frequência, RPO/RTO, criptografia, retenção e evidência de restauração precisam ser definidos pelo responsável operacional; não há metas aprovadas no repositório.

## Segredos de infraestrutura

- O Compose de produção exige `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD` e `SPRING_DATA_MONGODB_URI` com autenticação e `authSource=admin`; credenciais com caracteres reservados devem ser URL-encoded na URI.
- Redis de produção exige `REDIS_PASSWORD`; não reutilize a senha do PostgreSQL/Mongo. Injete todas as credenciais por secret manager no deploy, não por arquivo versionado.
- MongoDB só cria o usuário root durante a inicialização de um volume vazio. Antes de apontar credenciais para um volume Mongo existente, crie/valide o usuário em janela controlada e teste autenticação; não remova nem recrie o volume para “fazer a senha pegar”.

## Incidente e rotação de chaves

1. Declare incidente, registre UTC, sistemas afetados, impacto conhecido e responsável; preserve logs/auditoria sem copiar OTPs, senhas, tokens ou conteúdo privado para tickets.
2. Contenha: suspenda credenciais comprometidas, restrinja tráfego ou desabilite a integração afetada; não desligue nem limpe volumes antes de preservar evidência.
3. Rotacione a credencial no provedor/cofre e nos serviços consumidores: `AES_SECRET_KEY`, `OTP_HMAC_SECRET`, credenciais SMTP, `MERCADOPAGO_*`, credenciais de banco e Redis, conforme o tipo de exposição. Planeje compatibilidade/decriptação antes de trocar AES; uma troca simples pode tornar dados existentes ilegíveis.
4. Para rotação de `OTP_HMAC_SECRET`, invalide os desafios pendentes (TTL máximo de cinco minutos) ou aguarde a expiração antes da troca coordenada entre réplicas.
5. Para sessão/Redis, revogue sessões suspeitas; confirme que todas as réplicas usam os mesmos stores e segredos. Registre quem aprovou e validou a troca.
6. Restaure em staging, valide saúde, migrações, autenticação e integridade dos arquivos antes de qualquer cutover. Faça post-mortem com causa, escopo, ações e prazos de retenção aprovados.

## Alertas e e-mail

- Regras Prometheus em `ops/prometheus/manganetworking-alerts.yml` cobrem falha de entrega MFA e elevação de OTP inválido/bloqueado. Importar as regras e configurar canal/plantão no Prometheus/Alertmanager do operador; este repositório não contém um serviço de notificação de alertas.
- `MfaNotificationSender` registra sucesso/falha com campos estruturados e destinatário mascarado. O provedor SMTP deve ser configurado com TLS, domínio autenticado SPF/DKIM/DMARC e webhook/relatório de bounce com assinatura e política de retry. Provedor e endpoint ainda não foram escolhidos/configurados.
- Em bounce/complaint, suspenda retries para endereço inválido, registre evento mínimo sem corpo do e-mail e aplique política de supressão do provedor. A integração depende do contrato do provedor.

## Privacidade e governança

- O sistema registra operações de exportação/exclusão em auditoria append-only. Isso não substitui o registro completo de operações de tratamento da LGPD.
- A organização deve nomear e publicar o contato do encarregado/DPO, aprovar finalidade/base legal, categorias, compartilhamentos, prazos de retenção e canal dos titulares. Não inventar nome, prazo ou base legal no código.
- Após aprovação, documentar o inventário de operações, tabela de retenção por categoria e fluxo de descarte/anonimização; só então automatizar jobs de retenção e configurar alertas de falha.

## Pendências de aceite

- Operar backup e restore-check em ambiente real isolado, validar integridade e medir RPO/RTO.
- Escolher storage externo cifrado e política de retenção aprovada.
- Provisionar domínio/provedor SMTP autenticado, bounces e canal operacional de alertas.
- Nomear encarregado/DPO e aprovar inventário e política de retenção com responsável legal/produto.
- Executar exercício de incidente e registrar evidência assinada pelo operador.
