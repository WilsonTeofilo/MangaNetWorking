# Regras de negócio e editoriais

Estas regras definem limites do produto. A implementação deve ser autoritativa no backend e coberta por testes; a interface apenas comunica o estado retornado pela API.

## Escopo do produto

- Plataforma 100% digital e editorial. Não implementar loja física, merchandising, print-on-demand, estoque, frete, entrega ou descontos de loja.
- Obras publicadas devem ser originais e enviadas por quem tem os direitos. Não disponibilizar scans, raws, traduções não autorizadas, cópias ou obras de terceiros.
- Conteúdo pornográfico explícito/hentai é proibido. Denúncias de abuso ou conteúdo envolvendo menores exigem fluxo de segurança e escalonamento responsável, sem exposição pública do material.

## Monetização

- **Doações e Clube de Membros de criadores:** padrão 83% para o criador / 17% para a plataforma.
- **Exceção de recompensa Nível 4:** a taxa pode cair para 10% e o criador receber 90% apenas durante o período elegível de 15 dias, se concedido pelo sistema. A API/servidor é a fonte de valor, elegibilidade e expiração; o frontend nunca calcula o split.
- **Anúncios no leitor:** 58% criador / 42% plataforma, com registro de receita e contagem conforme a regra aprovada de páginas lidas. Usuários VIP não veem anúncios.
- **VIP da plataforma:** assinatura global de aproximadamente R$ 23 por 30 dias; remove anúncios, concede distintivo cosmético e pode habilitar leitura offline quando essa capacidade estiver pronta.
- VIP **não** substitui nem desbloqueia o Clube de Membros de um criador e não concede acesso antecipado aos capítulos desse criador.
- Pagamentos permanecem em sandbox até existir uma integração de gateway aprovada; não alegar movimentação real de dinheiro.

## Acesso a capítulos e publicação

- Acesso antecipado é concedido pelo vínculo de membro com o criador/obra conforme as regras da API; a data pública é controlada pelo servidor.
- A declaração de autoria original é requisito de publicação, mas não substitui revisão, processo de denúncia ou análise de direitos.
- Suspensão, arquivamento de denúncia e acesso ao backoffice são ações de moderação, não ações comuns de usuário. O backend deve verificar papel e autorização em cada chamada.

## Seasons e missões

- Seasons duram 60 dias; missões, critérios, progresso, boosts e prêmios são determinados no servidor.
- A UI pode exibir progresso/recompensas retornados pela API, mas não concede missão, visibilidade ou taxa reduzida por conta própria.
- Em conflitos de números ou critérios entre documentos, confira os ADRs e a implementação. Registre alteração de regra explicitamente, sem escolher silenciosamente um valor.

## Privacidade editorial

- Conteúdo e perfis privados devem respeitar a política de visibilidade, sem revelar dados pessoais ou financeiros em páginas públicas.
- Não colocar chaves PIX, CPF, credenciais, tokens ou dados de denúncia em logs, exemplos, screenshots ou respostas públicas.
