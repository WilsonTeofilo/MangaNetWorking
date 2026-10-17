# Requisitos de segurança e privacidade

Este documento descreve **o que precisa ser garantido**, não uma certificação nem prova de implementação. Antes de declarar um controle concluído, valide código, configuração, migrações, testes e o fluxo de ponta a ponta. Para decisão arquitetural, consulte os ADRs de sessão, storage e LGPD.

## Identidade, sessão e autorização

- Autenticação exige o fluxo de segundo fator previsto pelo produto; o cliente não pode marcar o 2FA como validado.
- Sessão/cookie deve ser tratado como credencial: HttpOnly, SameSite apropriado, Secure em HTTPS e proteção CSRF nas operações de escrita conforme o modelo adotado.
- Não confiar em user IDs, creator IDs, papel, VIP, ownership ou resultado de moderação enviados pelo navegador, query string ou headers controlados pelo cliente.
- Validar autenticação, papel e ownership no servidor em cada endpoint protegido. Backoffice e ações de moderador devem negar acesso por padrão a usuários sem papel autorizado.
- Não guardar segredos de sessão em `localStorage`/`sessionStorage`; não registrar OTP, cookies, tokens, senhas ou segredos em logs.
- Rate limiting e headers defensivos complementam autorização; não os trate como substitutos dela.

## Dados pessoais e LGPD

- Coletar e manter apenas dados necessários para o propósito declarado.
- CPF e chave PIX são dados sensíveis no contexto do produto: proteger em repouso, nunca expor em DTO público e evitar logs.
- Implementar exportação, correção, exclusão/anonimização e retenção legal de forma consistente entre tabelas, documentos, storage, auditoria e backups.
- Aplicar acesso mínimo necessário a denúncias e dados financeiros; não vazar detalhes de denunciantes a usuários não autorizados.
- Não afirmar conformidade jurídica somente por ter criptografia ou endpoints; retenção, bases legais, consentimento, incidentes e operação precisam de revisão apropriada.

## Upload e entrega de arquivos

- Limitar tamanho e quantidade antes de ler arquivos inteiros em memória; validar extensão, MIME declarado e assinatura real (magic bytes).
- Gerar nomes de arquivo no servidor; normalizar entrada e impedir path traversal, overwrite e acesso fora do diretório autorizado.
- Aplicar autorização para upload, associação do arquivo à obra/capítulo e leitura de conteúdo restrito; não confundir URL opaca com controle de acesso.
- Servir conteúdo com MIME validado e `nosniff`. URLs públicas só para conteúdo destinado ao público; preservar controle de acesso de capítulos antecipados/suspensos.
- Não aceitar ZIP ou descompactar arquivos sem limites de tamanho, quantidade, profundidade e proteção contra Zip Slip/bombas de descompressão.

## Moderação e conteúdo

- Denúncia pode ser pública; fila e ações de moderação são protegidas por papel no servidor e auditáveis.
- Validar status/transição, existência de obra/denúncia, motivo e notas. Operações devem ser consistentes, idempotentes quando necessário e não expor dados internos.
- Remover/suspender obra deve refletir-se em catálogo, feed, leitor, storage e cache, sem manter URLs de conteúdo acessíveis indevidamente.
- Escalonar incidentes de abuso ou material ilegal com procedimento aprovado. Evitar baixar, copiar, anexar ou espalhar conteúdo denunciado.

## Criptografia e operação

- Segredos e chaves criptográficas vêm de configuração segura/ambiente, nunca hardcoded; validar rotação, nonce/IV, modo de falha e compatibilidade de dados.
- Usar HTTPS em produção, configurações específicas de perfil e mensagens de erro que não exponham stack traces ou detalhes internos.
- Migrações precisam de defaults compatíveis com registros existentes e caminho de rollback/recuperação avaliado.
- A proteção offline no mobile continua sendo requisito futuro. Sandboxing/criptografia local/FLAG_SECURE reduzem risco, mas não garantem prevenção absoluta de captura ou pirataria; não prometer DRM infalível.

## Verificação mínima ao alterar segurança

1. Identifique a fronteira API → service → repository/storage e o ator autorizado.
2. Teste chamadas anônimas, usuário comum, usuário sem ownership e papel autorizado.
3. Teste dados inválidos, limites e estados de falha; confirme que nenhum efeito parcial ou vazamento ocorreu.
4. Rode os testes do módulo e o build; inspecione migração e configuração.
5. Atualize `IMPLEMENTATION_STATUS.md` somente com resultados observados.
