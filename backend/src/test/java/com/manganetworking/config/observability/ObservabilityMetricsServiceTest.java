package com.manganetworking.config.observability;

import com.manganetworking.config.security.RateLimitStore;
import com.manganetworking.service.session.SessionStore;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ObservabilityMetricsServiceTest {

    private SimpleMeterRegistry meterRegistry;

    @Mock
    private SessionStore sessionStore;

    @Mock
    private RateLimitStore rateLimitStore;

    private ObservabilityMetricsService metricsService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        metricsService = new ObservabilityMetricsService(meterRegistry, sessionStore, rateLimitStore);
    }

    @Test
    @DisplayName("Deve registrar incremento no contador de páginas lidas")
    void shouldIncrementPagesReadCounter() {
        metricsService.recordPageRead();
        metricsService.recordPageRead();

        double count = meterRegistry.get("manganetworking.pages.read.total").counter().count();
        assertThat(count).isEqualTo(2.0);
    }

    @Test
    @DisplayName("Deve registrar incremento no contador de anúncios publicitários")
    void shouldIncrementAdsImpressionCounter() {
        metricsService.recordAdImpression();

        double count = meterRegistry.get("manganetworking.ads.impression.total").counter().count();
        assertThat(count).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Deve expor gauges de sessões e rate limit ativos")
    void shouldExposeGaugesForActiveSessionsAndBuckets() {
        when(sessionStore.countActive()).thenReturn(42L);
        when(rateLimitStore.countActiveBuckets()).thenReturn(15);

        double activeSessions = meterRegistry.get("manganetworking.sessions.active").gauge().value();
        double activeBuckets = meterRegistry.get("manganetworking.ratelimit.buckets.active").gauge().value();

        assertThat(activeSessions).isEqualTo(42.0);
        assertThat(activeBuckets).isEqualTo(15.0);
    }
}
