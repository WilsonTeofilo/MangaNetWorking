package com.manganetworking.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Prevents a production instance from silently running with process-local auth state. */
@Component
@Profile("prod")
public class ProductionDistributedStoresGuard {

    public ProductionDistributedStoresGuard(
            @Value("${platform.session.store:inmemory}") String sessionStore,
            @Value("${platform.ratelimit.store:inmemory}") String rateLimitStore,
            @Value("${platform.otp.store:inmemory}") String otpStore
    ) {
        if (!"redis".equalsIgnoreCase(sessionStore) || !"redis".equalsIgnoreCase(rateLimitStore)
                || !"redis".equalsIgnoreCase(otpStore)) {
            throw new IllegalStateException(
                    "O perfil prod exige Redis para sessões, rate limit e desafios OTP (PLATFORM_SESSION_STORE=redis, " +
                            "PLATFORM_RATELIMIT_STORE=redis, PLATFORM_OTP_STORE=redis)."
            );
        }
    }
}
