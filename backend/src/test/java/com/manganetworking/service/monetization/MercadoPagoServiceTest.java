package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.FinancialLedgerEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.DonationRepository;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.monetization.dto.CheckoutResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class MercadoPagoServiceTest {

    private PlatformProperties properties;
    private UserRepository userRepository;
    private FinancialLedgerRepository ledgerRepository;
    private JdbcTemplate jdbcTemplate;
    private CreatorRepository creatorRepository;
    private MonetizationService monetizationService;
    private MercadoPagoService service;
    private MockRestServiceServer mercadoPago;

    @BeforeEach
    void setUp() {
        properties = new PlatformProperties();
        userRepository = mock(UserRepository.class);
        ledgerRepository = mock(FinancialLedgerRepository.class);
        jdbcTemplate = mock(JdbcTemplate.class);
        creatorRepository = mock(CreatorRepository.class);

        monetizationService = new MonetizationService(
                mock(DonationRepository.class),
                mock(MembershipSubscriptionRepository.class),
                ledgerRepository,
                creatorRepository,
                userRepository,
                mock(WorkRepository.class),
                mock(ChapterRepository.class),
                properties
        );

        service = new MercadoPagoService(properties, userRepository, monetizationService, jdbcTemplate,
                creatorRepository, mock(WorkRepository.class), mock(ChapterRepository.class));
        RestClient.Builder builder = RestClient.builder().baseUrl("https://api.mercadopago.com");
        mercadoPago = MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(service, "restClient", builder.build());
    }

    @Test
    @DisplayName("Retry de doação reutiliza checkout persistido sem criar nova preferência")
    void reusesPersistedDonationCheckoutOnRetry() throws Exception {
        properties.getMercadopago().setAccessToken("TEST-placeholder");
        UUID payerId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        String idempotencyKey = UUID.randomUUID().toString();
        UserEntity payer = new UserEntity();
        payer.setEmail("reader@teste.com");
        CreatorEntity creator = new CreatorEntity();
        creator.setId(creatorId);
        creator.setHandle("autora");
        creator.setDocumentCpf("529.982.247-25");
        creator.setMonetizationLevel(2);
        when(userRepository.findById(payerId)).thenReturn(Optional.of(payer));
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        when(jdbcTemplate.query(anyString(), any(ResultSetExtractor.class), any(), any(), any()))
                .thenAnswer(invocation -> {
                    ResultSet resultSet = mock(ResultSet.class);
                    when(resultSet.next()).thenReturn(true);
                    when(resultSet.getString("checkout_reference")).thenReturn("0123456789abcdef");
                    when(resultSet.getObject("creator_id", UUID.class)).thenReturn(creatorId);
                    when(resultSet.getObject("work_id", UUID.class)).thenReturn(null);
                    when(resultSet.getObject("chapter_id", UUID.class)).thenReturn(null);
                    when(resultSet.getString("product_type")).thenReturn("DONATION");
                    when(resultSet.getBigDecimal("expected_amount_brl")).thenReturn(new BigDecimal("10.00"));
                    when(resultSet.getString("message")).thenReturn("Obrigado!");
                    when(resultSet.getString("preference_id")).thenReturn("pref-persistida");
                    when(resultSet.getString("checkout_url")).thenReturn(
                            "https://www.mercadopago.com.br/checkout/start?pref_id=pref-persistida");
                    ResultSetExtractor<?> extractor = invocation.getArgument(1);
                    return extractor.extractData(resultSet);
                });

        CheckoutResponseDto response = service.createDonationCheckoutPreference(
                payerId, creatorId, null, null, new BigDecimal("10.00"), "Obrigado!", idempotencyKey);

        assertThat(response.checkoutUrl()).contains("pref-persistida");
        assertThat(response.amountBrl()).isEqualByComparingTo("10.00");
        mercadoPago.verify();
    }

    @Test
    @DisplayName("Falha ao criar checkout sem Access Token")
    void shouldFailIfAccessTokenMissing() {
        assertThatThrownBy(() -> service.createVipCheckoutPreference(UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MERCADOPAGO_ACCESS_TOKEN");
    }

    @Test
    @DisplayName("Cria checkout e persiste a associação checkout -> usuário -> valor")
    void createsCheckoutAndPersistsAssociation() {
        properties.getMercadopago().setAccessToken("TEST-placeholder");
        properties.setVipPrice(new BigDecimal("23.00"));
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setEmail("reader@teste.com");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        mercadoPago.expect(requestTo("https://api.mercadopago.com/checkout/preferences"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer TEST-placeholder"))
                .andExpect(jsonPath("$.external_reference", startsWith("MN_VIP|" + userId + "|")))
                .andExpect(jsonPath("$.items[0].unit_price", is(23.0)))
                .andRespond(withSuccess(
                        "{\"id\":\"pref-999\",\"init_point\":"
                                + "\"https://www.mercadopago.com.br/checkout/start?pref_id=pref-999\"}",
                        MediaType.APPLICATION_JSON));

        String checkoutUrl = service.createVipCheckoutPreference(userId);

        assertThat(checkoutUrl).startsWith("https://www.mercadopago.com.br/");
        verify(jdbcTemplate).update(
                anyString(), anyString(), eq("pref-999"), eq(userId), eq(new BigDecimal("23.00")));
        mercadoPago.verify();
    }

    @Test
    @DisplayName("Aceita assinatura HMAC-SHA256 válida e rejeita assinatura ausente/inválida")
    void validatesWebhookSignatureStrictly() throws Exception {
        String secret = "test-webhook-secret-only";
        properties.getMercadopago().setWebhookSecret(secret);
        String dataId = "123456789";
        String requestId = "req-abc-999";
        String ts = String.valueOf(Instant.now().getEpochSecond());
        String manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = "ts=" + ts + ",v1="
                + HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));

        assertThat(service.verifyWebhookSignature(signature, requestId, dataId)).isTrue();
        assertThat(service.verifyWebhookSignature(null, requestId, dataId)).isFalse();
        assertThat(service.verifyWebhookSignature("ts=" + ts + ",v1=bad", requestId, dataId)).isFalse();
    }

    @Test
    @DisplayName("Pagamento aprovado com checkout persistido ativa VIP e webhook duplicado não duplica benefício")
    void activatesVipIdempotentlyForApprovedPayment() {
        properties.getMercadopago().setAccessToken("TEST-placeholder");
        properties.setVipPrice(new BigDecimal("23.00"));
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setEmail("reader@teste.com");

        String checkoutReference = "0123456789abcdef";
        String externalReference = "MN_VIP|" + userId + "|" + checkoutReference;
        // Sem metadata.preference_id: o vínculo vem de external_reference + tabela local.
        String paymentBody = "{\"status\":\"approved\",\"currency_id\":\"BRL\","
                + "\"transaction_amount\":23,\"external_reference\":\"" + externalReference + "\"}";
        String preferenceBody = "{\"id\":\"pref-123\",\"external_reference\":\""
                + externalReference + "\",\"items\":[{\"unit_price\":23,\"currency_id\":\"BRL\"}]}";

        mercadoPago.expect(ExpectedCount.twice(),
                        requestTo("https://api.mercadopago.com/v1/payments/approved"))
                .andRespond(withSuccess(paymentBody, MediaType.APPLICATION_JSON));
        mercadoPago.expect(ExpectedCount.twice(),
                        requestTo("https://api.mercadopago.com/checkout/preferences/pref-123"))
                .andRespond(withSuccess(preferenceBody, MediaType.APPLICATION_JSON));

        when(jdbcTemplate.query(anyString(), any(ResultSetExtractor.class), any(), any(), any()))
                .thenReturn("pref-123");
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AtomicReference<FinancialLedgerEntity> persistedLedger = new AtomicReference<>();
        when(ledgerRepository.findByPaymentExternalId(anyString()))
                .thenAnswer(invocation -> Optional.ofNullable(persistedLedger.get()));
        when(ledgerRepository.save(any(FinancialLedgerEntity.class))).thenAnswer(invocation -> {
            FinancialLedgerEntity ledger = invocation.getArgument(0);
            persistedLedger.set(ledger);
            return ledger;
        });

        service.processPaymentNotification("approved");
        service.processPaymentNotification("approved");

        mercadoPago.verify();
        verify(userRepository, times(1)).save(any(UserEntity.class));
        verify(ledgerRepository, times(1)).save(any(FinancialLedgerEntity.class));
        assertThat(user.isVipActive()).isTrue();
    }

    @Test
    @DisplayName("Pagamento aprovado sem checkout persistido não ativa VIP")
    void ignoresPaymentWithoutPersistedCheckout() {
        properties.getMercadopago().setAccessToken("TEST-placeholder");
        properties.setVipPrice(new BigDecimal("23.00"));
        UUID userId = UUID.randomUUID();
        String externalReference = "MN_VIP|" + userId + "|ffffffffffffffff";
        String paymentBody = "{\"status\":\"approved\",\"currency_id\":\"BRL\","
                + "\"transaction_amount\":23,\"external_reference\":\"" + externalReference + "\"}";

        mercadoPago.expect(requestTo("https://api.mercadopago.com/v1/payments/no-checkout"))
                .andRespond(withSuccess(paymentBody, MediaType.APPLICATION_JSON));
        when(jdbcTemplate.query(anyString(), any(ResultSetExtractor.class), any(), any(), any()))
                .thenReturn(null);

        service.processPaymentNotification("no-checkout");

        mercadoPago.verify();
        verify(userRepository, never()).findByIdForUpdate(any());
        verify(ledgerRepository, never()).save(any(FinancialLedgerEntity.class));
    }

    @Test
    @DisplayName("Pagamento pendente/rejeitado ou de valor/moeda divergente não ativa VIP")
    void rejectsUnapprovedOrMismatchedPayments() {
        properties.getMercadopago().setAccessToken("TEST-placeholder");
        mercadoPago.expect(ExpectedCount.once(),
                        requestTo("https://api.mercadopago.com/v1/payments/pending"))
                .andExpect(header("Authorization", "Bearer TEST-placeholder"))
                .andRespond(withSuccess("{\"status\":\"pending\"}", MediaType.APPLICATION_JSON));
        mercadoPago.expect(ExpectedCount.once(),
                        requestTo("https://api.mercadopago.com/v1/payments/rejected"))
                .andExpect(header("Authorization", "Bearer TEST-placeholder"))
                .andRespond(withSuccess("{\"status\":\"rejected\"}", MediaType.APPLICATION_JSON));
        mercadoPago.expect(ExpectedCount.once(),
                        requestTo("https://api.mercadopago.com/v1/payments/wrong-amount"))
                .andRespond(withSuccess("{\"status\":\"approved\",\"currency_id\":\"BRL\","
                        + "\"transaction_amount\":1}", MediaType.APPLICATION_JSON));
        mercadoPago.expect(ExpectedCount.once(),
                        requestTo("https://api.mercadopago.com/v1/payments/wrong-currency"))
                .andRespond(withSuccess("{\"status\":\"approved\",\"currency_id\":\"USD\","
                        + "\"transaction_amount\":23}", MediaType.APPLICATION_JSON));

        service.processPaymentNotification("pending");
        service.processPaymentNotification("rejected");
        service.processPaymentNotification("wrong-amount");
        service.processPaymentNotification("wrong-currency");

        mercadoPago.verify();
        verify(ledgerRepository, never()).save(any(FinancialLedgerEntity.class));
        verify(userRepository, never()).findByIdForUpdate(any());
    }
}
