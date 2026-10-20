package com.manganetworking.config.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProductionDistributedStoresGuardTest {

    @Test
    void acceptsRedisForBothDistributedStores() {
        assertDoesNotThrow(() -> new ProductionDistributedStoresGuard("redis", "redis", "redis"));
    }

    @Test
    void rejectsAnyProcessLocalProductionStore() {
        assertThrows(IllegalStateException.class,
                () -> new ProductionDistributedStoresGuard("inmemory", "redis", "redis"));
        assertThrows(IllegalStateException.class,
                () -> new ProductionDistributedStoresGuard("redis", "inmemory", "redis"));
        assertThrows(IllegalStateException.class,
                () -> new ProductionDistributedStoresGuard("redis", "redis", "inmemory"));
    }
}
