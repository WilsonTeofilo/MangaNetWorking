# ADR-003: Isolamento do Adaptador de Pagamentos (Mercado Pago Sandbox) e Idempotência Contábil

## Status
Aprovado

## Contexto
O modelo de negócio prevê doações diretas e clube de membros com retenção de 17% pela plataforma e repasse de 83% ao criador, além de anúncios com divisão de 58% para o criador e 42% para a plataforma.
Em etapas futuras, a integração financeira oficial será com o Mercado Pago. No momento atual de desenvolvimento local:
1. Nenhuma transação pode movimentar dinheiro real nem exigir chaves privadas reais de API.
2. Webhooks de provedores de pagamento podem reenviar eventos repetidos ou fora de ordem pela rede. Sem controle de idempotência, isso geraria duplicação de saldo na carteira do autor.

## Decisão
1. **Interface de Fronteira `PaymentGatewayPort`:**
   - O domínio da aplicação depende exclusivamente de contratos agnósticos de gateway (`createPaymentIntent`, `verifyWebhookNotification`).
   - Implementação local: `SandboxPaymentGatewayAdapter`, permitindo simular pagamentos aprovados, pendentes e cancelados sem rede externa.

2. **Idempotência Obrigatória via Ledger Append-Only:**
   - Toda operação de crédito utiliza `paymentExternalId` como chave primária de unicidade no banco de dados (`FinancialLedgerEntity`).
   - Se o webhook do gateway reenviar a notificação com o mesmo `paymentExternalId`, o servidor detecta o registro existente em $O(1)$ e descarta o processamento duplicado sem alterar o saldo da carteira do autor.

3. **Cálculo Determinístico de Splits:**
   - Valores monetários manipulados estritamente com `BigDecimal` e arredondamento `RoundingMode.HALF_UP` com duas casas decimais.
   - Constantes explícitas: `PLATFORM_FEE_RATE = 0.17`, `CREATOR_SHARE_RATE = 0.83`, `CREATOR_AD_SHARE = 0.58`, `PLATFORM_AD_SHARE = 0.42`.

## Consequências
- A integração futura com as APIs reais do Mercado Pago consistirá apenas em plugar a implementação `MercadoPagoPaymentAdapter`, sem alterar uma linha de código do domínio ou dos controllers.
- Blindagem total contra fraudes de duplicidade de doações ou assinaturas.
