package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.monetization.dto.CheckoutResponseDto;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.UUID;

/**
 * Fachada (Facade) para as operações de integração com o Mercado Pago.
 *
 * <p>Decompõe suas responsabilidades em classes especialistas:
 * <ul>
 *     <li>{@link MercadoPagoWebhookValidator}: validação criptográfica de assinaturas HMAC-SHA256;</li>
 *     <li>{@link MercadoPagoCheckoutService}: geração de preferências Checkout Pro e persistência de intenções;</li>
 *     <li>{@link MercadoPagoPaymentProcessor}: processamento e conciliação idempotente de pagamentos notificados.</li>
 * </ul>
 * Mantém 100% de retrocompatibilidade com controladores e contratos existentes.</p>
 */
@Service
public class MercadoPagoService {

    private static final String MP_API_BASE = "https://api.mercadopago.com";

    private final MercadoPagoWebhookValidator webhookValidator;
    private final MercadoPagoCheckoutService checkoutService;
    private final MercadoPagoPaymentProcessor paymentProcessor;

    /** Referência reflexiva mantida para compatibilidade com MockRestServiceServer nos testes legados. */
    private RestClient restClient;

    public MercadoPagoService(
            MercadoPagoWebhookValidator webhookValidator,
            MercadoPagoCheckoutService checkoutService,
            MercadoPagoPaymentProcessor paymentProcessor
    ) {
        this.webhookValidator = webhookValidator;
        this.checkoutService = checkoutService;
        this.paymentProcessor = paymentProcessor;
    }

    /**
     * Construtor de conveniência para montagem manual em testes de integração e unitários.
     */
    public MercadoPagoService(
            PlatformProperties properties,
            UserRepository userRepository,
            MonetizationService monetizationService,
            JdbcTemplate jdbcTemplate,
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder()
                .baseUrl(MP_API_BASE)
                .requestFactory(requestFactory)
                .build();

        this.webhookValidator = new MercadoPagoWebhookValidator(properties);
        this.checkoutService = new MercadoPagoCheckoutService(
                properties, userRepository, creatorRepository, workRepository, chapterRepository, jdbcTemplate,
                () -> this.restClient
        );
        this.paymentProcessor = new MercadoPagoPaymentProcessor(
                properties, monetizationService, jdbcTemplate,
                () -> this.restClient
        );
    }

    /**
     * Atualiza o RestClient em cascata para os componentes filhos (utilizado em suítes de teste com mock server).
     */
    public void setRestClient(RestClient restClient) {
        this.restClient = restClient;
        if (this.checkoutService != null) {
            this.checkoutService.setRestClient(restClient);
        }
        if (this.paymentProcessor != null) {
            this.paymentProcessor.setRestClient(restClient);
        }
    }

    public BigDecimal getVipPrice() {
        return checkoutService.getVipPrice();
    }

    @Transactional
    public CheckoutResponseDto createDonationCheckoutPreference(
            UUID payerUserId, UUID creatorId, UUID workId, UUID chapterId,
            BigDecimal amountBrl, String message, String idempotencyKey
    ) {
        return checkoutService.createDonationCheckoutPreference(
                payerUserId, creatorId, workId, chapterId, amountBrl, message, idempotencyKey
        );
    }

    @Transactional
    public CheckoutResponseDto createMembershipCheckoutPreference(
            UUID payerUserId, UUID creatorId, String idempotencyKey
    ) {
        return checkoutService.createMembershipCheckoutPreference(payerUserId, creatorId, idempotencyKey);
    }

    public String createVipCheckoutPreference(UUID userId) {
        return checkoutService.createVipCheckoutPreference(userId);
    }

    public boolean verifyWebhookSignature(String signatureHeader, String requestIdHeader, String dataId) {
        return webhookValidator.verifyWebhookSignature(signatureHeader, requestIdHeader, dataId);
    }

    @Transactional
    public void processPaymentNotification(String paymentId) {
        paymentProcessor.processPaymentNotification(paymentId);
    }
}
