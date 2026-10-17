package com.manganetworking.config.properties;

import com.manganetworking.config.security.AesCryptoConverter;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Propriedades centralizadas da plataforma MangaNetWorking.
 * Elimina valores 'hardcoded' e permite parametrização total via application.yml ou variáveis de ambiente.
 */
@Component
@ConfigurationProperties(prefix = "platform")
public class PlatformProperties {

    private static final Logger log = LoggerFactory.getLogger(PlatformProperties.class);

    @Autowired(required = false)
    private Environment environment;

    private BigDecimal feePercentage = new BigDecimal("0.17");
    /**
     * Contrapartida informativa de {@link #feePercentage}. O split financeiro é calculado a partir de
     * {@code feePercentage} (líquido = bruto − taxa), portanto este valor NÃO é aplicado na conta:
     * serve de referência e precisa somar 1 com a taxa (validado em {@link #validateFinancialConsistency()}).
     */
    private BigDecimal creatorSharePercentage = new BigDecimal("0.83");
    private BigDecimal vipPrice = new BigDecimal("23.00");

    private Membership membership = new Membership();
    private Ads ads = new Ads();
    private Security security = new Security();
    private Storage storage = new Storage();

    @PostConstruct
    void init() {
        validateFinancialConsistency();
        initSecurityAndCrypto();
    }

    /** Detecta configuração financeira inconsistente (taxa + repasse ≠ 100%) no boot. */
    void validateFinancialConsistency() {
        if (feePercentage == null || creatorSharePercentage == null) {
            return;
        }
        if (feePercentage.add(creatorSharePercentage).compareTo(BigDecimal.ONE) != 0) {
            log.warn("[CONFIG] platform.fee-percentage ({}) + platform.creator-share-percentage ({}) != 1.00. "
                    + "O split usa apenas fee-percentage (líquido = bruto - taxa); ajuste os dois valores.",
                    feePercentage, creatorSharePercentage);
        }
    }

    /**
     * Sincroniza a chave AES configurada no application.yml com o conversor JPA {@link AesCryptoConverter}
     * e garante fail-fast no perfil de produção caso a chave secreta não seja informada.
     */
    void initSecurityAndCrypto() {
        String key = (security != null) ? security.getAesSecretKey() : null;
        if (key != null && !key.isBlank()) {
            AesCryptoConverter.setCustomKey(key);
            log.info("[AES-CRYPTO] Chave AES-256 configurada com sucesso a partir de platform.security.aes-secret-key.");
        } else {
            boolean isProd = environment != null && environment.matchesProfiles("prod");
            if (isProd) {
                throw new IllegalStateException("[SEGURANÇA CRÍTICA] Perfil 'prod' ativo mas AES_SECRET_KEY não foi configurada! "
                        + "Defina a variável de ambiente AES_SECRET_KEY com pelo menos 32 caracteres ASCII.");
            }
        }
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public static class Membership {
        private BigDecimal minPrice = new BigDecimal("7.99");
        private BigDecimal maxPrice = new BigDecimal("45.99");

        public BigDecimal getMinPrice() { return minPrice; }
        public void setMinPrice(BigDecimal minPrice) { this.minPrice = minPrice; }

        public BigDecimal getMaxPrice() { return maxPrice; }
        public void setMaxPrice(BigDecimal maxPrice) { this.maxPrice = maxPrice; }
    }

    public static class Ads {
        private int pagesPerAd = 30;
        private BigDecimal cpmBrl = new BigDecimal("0.05");
        private BigDecimal creatorSharePercentage = new BigDecimal("0.58");
        private BigDecimal platformSharePercentage = new BigDecimal("0.42");

        public int getPagesPerAd() { return pagesPerAd; }
        public void setPagesPerAd(int pagesPerAd) { this.pagesPerAd = pagesPerAd; }

        public BigDecimal getCpmBrl() { return cpmBrl; }
        public void setCpmBrl(BigDecimal cpmBrl) { this.cpmBrl = cpmBrl; }

        public BigDecimal getCreatorSharePercentage() { return creatorSharePercentage; }
        public void setCreatorSharePercentage(BigDecimal creatorSharePercentage) { this.creatorSharePercentage = creatorSharePercentage; }

        public BigDecimal getPlatformSharePercentage() { return platformSharePercentage; }
        public void setPlatformSharePercentage(BigDecimal platformSharePercentage) { this.platformSharePercentage = platformSharePercentage; }
    }

    public static class Security {
        private boolean twoFactorMandatory = true;
        /**
         * Chave AES para criptografia de dados sensíveis (CPF/PIX).
         * Em produção, deve ser definida via {@code platform.security.aes-secret-key} no YAML
         * ou pela variável de ambiente {@code AES_SECRET_KEY}.
         * Se não definida, o {@link AesCryptoConverter} usará sua chave de desenvolvimento.
         */
        private String aesSecretKey;
        private int rateLimitPerMinute = 120;
        private int authRateLimitPerMinute = 15;
        /**
         * Intervalo em milissegundos para execução da rotina de limpeza ativa de sessões expiradas.
         * <p>
         * Referência OWASP Session Management Cheat Sheet: expiração forçada periódica
         * para prevenir memory leaks e esgotamento de recursos (Unbounded Memory Allocation).
         * </p>
         * <p>
         * Valor padrão: 3.600.000 ms (1 hora).
         * </p>
         */
        private long sessionCleanupIntervalMs = 3_600_000L; // 1 hora

        /**
         * Se {@code true}, o rate limit usa o primeiro IP de {@code X-Forwarded-For}.
         * Deve permanecer {@code false} fora de um proxy reverso confiável — o header é
         * controlável pelo cliente e, se confiado às cegas, permite burlar o throttling.
         */
        private boolean trustForwardedHeaders = false;

        public boolean isTwoFactorMandatory() { return twoFactorMandatory; }
        public void setTwoFactorMandatory(boolean twoFactorMandatory) { this.twoFactorMandatory = twoFactorMandatory; }

        public String getAesSecretKey() { return aesSecretKey; }
        public void setAesSecretKey(String aesSecretKey) { this.aesSecretKey = aesSecretKey; }

        public int getRateLimitPerMinute() { return rateLimitPerMinute; }
        public void setRateLimitPerMinute(int rateLimitPerMinute) { this.rateLimitPerMinute = rateLimitPerMinute; }

        public int getAuthRateLimitPerMinute() { return authRateLimitPerMinute; }
        public void setAuthRateLimitPerMinute(int authRateLimitPerMinute) { this.authRateLimitPerMinute = authRateLimitPerMinute; }

        public long getSessionCleanupIntervalMs() { return sessionCleanupIntervalMs; }
        public void setSessionCleanupIntervalMs(long sessionCleanupIntervalMs) { this.sessionCleanupIntervalMs = sessionCleanupIntervalMs; }

        public boolean isTrustForwardedHeaders() { return trustForwardedHeaders; }
        public void setTrustForwardedHeaders(boolean trustForwardedHeaders) { this.trustForwardedHeaders = trustForwardedHeaders; }
    }

    public static class Storage {
        private String localUploadDir = "./data/uploads";

        /** Tamanho máximo por arquivo enviado (defesa em profundidade; alinhado ao multipart do container). */
        private long maxFileSizeMb = 15;

        public String getLocalUploadDir() { return localUploadDir; }
        public void setLocalUploadDir(String localUploadDir) { this.localUploadDir = localUploadDir; }

        public long getMaxFileSizeMb() { return maxFileSizeMb; }
        public void setMaxFileSizeMb(long maxFileSizeMb) { this.maxFileSizeMb = maxFileSizeMb; }
    }

    public BigDecimal getFeePercentage() { return feePercentage; }
    public void setFeePercentage(BigDecimal feePercentage) { this.feePercentage = feePercentage; }

    public BigDecimal getCreatorSharePercentage() { return creatorSharePercentage; }
    public void setCreatorSharePercentage(BigDecimal creatorSharePercentage) { this.creatorSharePercentage = creatorSharePercentage; }

    public BigDecimal getVipPrice() { return vipPrice; }
    public void setVipPrice(BigDecimal vipPrice) { this.vipPrice = vipPrice; }

    public Membership getMembership() { return membership; }
    public void setMembership(Membership membership) { this.membership = membership; }

    public Ads getAds() { return ads; }
    public void setAds(Ads ads) { this.ads = ads; }

    public Security getSecurity() { return security; }
    public void setSecurity(Security security) { this.security = security; }

    public Storage getStorage() { return storage; }
    public void setStorage(Storage storage) { this.storage = storage; }
}
