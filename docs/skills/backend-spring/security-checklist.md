# Security checklist — backend

Derivado de `docs/reviews/SECURITY_REQUIREMENTS.md` e dos ADRs 002, 004 e 006. Aplique a **toda** mudança de endpoint, dado sensível ou fluxo de arquivo. Requisito ainda não verificado **não** está pronto.

## Identidade, sessão e autorização

- [ ] Identidade resolvida no servidor via `SecurityContextUtils`; nenhum ID, papel, VIP ou ownership aceito do cliente (header, query, body).
- [ ] Cada endpoint protegido valida autenticação **e** autorização/ownership; backoffice e moderação negam por padrão quem não tem papel.
- [ ] 2FA controlado 100% no backend; o cliente nunca informa que o segundo fator passou.
- [ ] Cookie de sessão `HttpOnly` + `SameSite` adequado; `Secure` em HTTPS; CSRF nas operações de escrita.
- [ ] Nenhum segredo de sessão/OTP/token em `localStorage`/`sessionStorage` nem em logs.
- [ ] Rate limiting e headers defensivos aplicados, mas tratados como **complemento** da autorização, não substituto.

## Dados pessoais e LGPD

- [ ] CPF e chave PIX criptografados em repouso (AES-256-GCM) e **ausentes** de qualquer DTO público, log ou resposta.
- [ ] Coleta mínima; apenas o necessário ao propósito declarado.
- [ ] Exportação, correção, exclusão/anonimização e retenção consistentes entre tabelas, documentos, storage, auditoria e backups.
- [ ] Acesso mínimo a denúncias e dados financeiros; detalhes do denunciante não vazam.

## Upload e entrega de arquivos

- [ ] Tamanho e quantidade limitados **antes** de ler o arquivo inteiro em memória.
- [ ] Extensão, MIME declarado e assinatura real (magic bytes) validados; allow-list JPEG/PNG/WebP.
- [ ] Nome de arquivo gerado no servidor; entrada normalizada; path traversal, overwrite e acesso fora do diretório bloqueados.
- [ ] Autorização de upload e de leitura de conteúdo restrito; URL opaca não é controle de acesso.
- [ ] Conteúdo servido com MIME validado e `nosniff`; early access/suspenso continua bloqueado na leitura direta.
- [ ] ZIP (se existir) só com limites de tamanho, quantidade, profundidade e proteção contra Zip Slip/bomba de descompressão.

## Moderação, criptografia e operação

- [ ] Denúncia pode ser pública; fila e ações exigem papel e são auditáveis; transições de estado validadas e idempotentes quando necessário.
- [ ] Suspender/remover obra reflete em catálogo, feed, leitor, storage e cache, sem manter URL de conteúdo acessível.
- [ ] Chaves/segredos vêm de configuração/ambiente; rotação, nonce/IV, modo de falha e compatibilidade avaliados.
- [ ] HTTPS em produção; mensagens de erro sem stack trace ou detalhe interno.
- [ ] Migração com default compatível com registros existentes e caminho de rollback avaliado.
- [ ] Nada de prometer DRM infalível; proteção offline mobile é requisito futuro (ADR-006).

## Verificação mínima (obrigatória antes de fechar)

1. Testar chamadas: anônimo, usuário comum, usuário sem ownership e papel autorizado.
2. Testar dados inválidos, limites e estados de falha; confirmar que não houve efeito parcial nem vazamento.
3. Rodar testes do módulo e o build; inspecionar migração e configuração alteradas.
4. Registrar em `docs/reviews/IMPLEMENTATION_STATUS.md` só o que foi efetivamente verificado.
