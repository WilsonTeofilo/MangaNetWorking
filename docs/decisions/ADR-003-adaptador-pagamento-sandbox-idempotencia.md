# ADR-003: Isolamento do Adaptador de Pagamentos (Mercado Pago Sandbox) e Idempotência Contábil

## Status
Parcial — decisão registrada; o adaptador dedicado ainda não foi extraído. A implementação atual usa `MercadoPagoService` diretamente e a homologação Sandbox segue pendente.

## Contexto
O modelo de negócio prevê doações diretas e clube de membros com retenção de 17% pela plataforma e repasse de 83% ao criador, além de anúncios com divisão de 58% para o criador e 42% para a plataforma.
A integração financeira oficial é com o Mercado Pago; a implementação atual usa `MercadoPagoService`, ainda sem o adaptador dedicado. No momento atual de desenvolvimento local:
1. Nenhuma transação pode movimentar dinheiro real nem exigir chaves privadas reais de API.
2. Webhooks de provedores de pagamento podem reenviar eventos repetidos ou fora de ordem pela rede. Sem controle de idempotência, isso geraria duplicação de saldo na carteira do autor.

## Decisão
1. **Interface de Fronteira `PaymentGatewayPort`:**
   - O domínio da aplicação depende exclusivamente de contratos agnósticos de gateway (`createPaymentIntent`, `verifyWebhookNotification`).
   - Implementação prevista: `SandboxPaymentGatewayAdapter` para simular pagamentos aprovados, pendentes e cancelados sem rede externa; o código atual ainda não extraiu esse adaptador e usa `MercadoPagoService`.

2. **Idempotência Obrigatória via Ledger Append-Only:**
   - Toda operação de crédito utiliza `paymentExternalId` como chave primária de unicidade no banco de dados (`FinancialLedgerEntity`).
   - Se o webhook do gateway reenviar a notificação com o mesmo `paymentExternalId`, o servidor detecta o registro existente em $O(1)$ e descarta o processamento duplicado sem alterar o saldo da carteira do autor.

3. **Cálculo Determinístico de Splits:**
   - Valores monetários manipulados estritamente com `BigDecimal` e arredondamento `RoundingMode.HALF_UP` com duas casas decimais.
   - Constantes explícitas: `PLATFORM_FEE_RATE = 0.17`, `CREATOR_SHARE_RATE = 0.83`, `CREATOR_AD_SHARE = 0.58`, `PLATFORM_AD_SHARE = 0.42`.

## Consequências
- A implementação atual usa `MercadoPagoService` diretamente; a extração do `PaymentGatewayPort`/`MercadoPagoPaymentAdapter` permanece dívida arquitetural, sem bloquear a homologação funcional.
- A homologação Sandbox com credenciais reais, webhook público e pagamento de teste permanece pendente (item #50); sem essa evidência, não há compra real nem ativação financeira de produção.
- O ledger append-only e a chave `paymentExternalId` continuam sendo a proteção contra duplicidade de doações ou assinaturas.
