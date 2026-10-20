package com.manganetworking.config.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionMetricsScrapeTokenGuardTest {

    @Test
    @DisplayName("Perfil prod recusa token ausente")
    void rejectsMissingToken() {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> new ProductionMetricsScrapeTokenGuard(""));
        assertTrue(error.getMessage().contains("METRICS_SCRAPE_TOKEN"));
    }

    @Test
    @DisplayName("Perfil prod recusa token curto")
    void rejectsShortToken() {
        assertThrows(IllegalStateException.class, () -> new ProductionMetricsScrapeTokenGuard("curto"));
    }

    @Test
    @DisplayName("Perfil prod aceita token com 32 caracteres ou mais")
    void acceptsLongEnoughToken() {
        assertDoesNotThrow(() -> new ProductionMetricsScrapeTokenGuard("a".repeat(32)));
    }
}
