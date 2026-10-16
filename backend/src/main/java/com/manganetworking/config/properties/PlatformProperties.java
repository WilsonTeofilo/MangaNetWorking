package com.manganetworking.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

import org.springframework.stereotype.Component;

/**
 * Propriedades centralizadas da plataforma MangaNetWorking.
 * Elimina valores 'hardcoded' e permite parametrização total via application.yml ou variáveis de ambiente.
 */
@Component
@ConfigurationProperties(prefix = "platform")
public class PlatformProperties {

    private BigDecimal feePercentage = new BigDecimal("0.17");
    private BigDecimal creatorSharePercentage = new BigDecimal("0.83");
    private BigDecimal vipPrice = new BigDecimal("23.00");

    private Membership membership = new Membership();
    private Ads ads = new Ads();
    private Security security = new Security();
    private Storage storage = new Storage();

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
        private String aesSecretKey = "MangaNetWorking2026AESKeySecret!";
        private int rateLimitPerMinute = 120;
        private int authRateLimitPerMinute = 15;

        public boolean isTwoFactorMandatory() { return twoFactorMandatory; }
        public void setTwoFactorMandatory(boolean twoFactorMandatory) { this.twoFactorMandatory = twoFactorMandatory; }

        public String getAesSecretKey() { return aesSecretKey; }
        public void setAesSecretKey(String aesSecretKey) { this.aesSecretKey = aesSecretKey; }

        public int getRateLimitPerMinute() { return rateLimitPerMinute; }
        public void setRateLimitPerMinute(int rateLimitPerMinute) { this.rateLimitPerMinute = rateLimitPerMinute; }

        public int getAuthRateLimitPerMinute() { return authRateLimitPerMinute; }
        public void setAuthRateLimitPerMinute(int authRateLimitPerMinute) { this.authRateLimitPerMinute = authRateLimitPerMinute; }
    }

    public static class Storage {
        private String localUploadDir = "./data/uploads";

        public String getLocalUploadDir() { return localUploadDir; }
        public void setLocalUploadDir(String localUploadDir) { this.localUploadDir = localUploadDir; }
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
