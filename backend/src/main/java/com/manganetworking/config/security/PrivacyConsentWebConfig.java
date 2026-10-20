package com.manganetworking.config.security;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class PrivacyConsentWebConfig implements WebMvcConfigurer {
    private final PrivacyConsentInterceptor privacyConsentInterceptor;

    public PrivacyConsentWebConfig(PrivacyConsentInterceptor privacyConsentInterceptor) {
        this.privacyConsentInterceptor = privacyConsentInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(privacyConsentInterceptor).addPathPatterns("/api/**");
    }
}
