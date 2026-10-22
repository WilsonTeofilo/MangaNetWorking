package com.manganetworking.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReservedTestDomainPolicyTest {

    @Test
    @DisplayName("Domínios reservados (RFC 2606/6761 e test.com) são bloqueados")
    void shouldBlockReservedTestDomains() {
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("smoke_creator_1@test.com"));
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("qa.leitor@example.com"));
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("alguem@mail.test"));
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("alguem@mail.example"));
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("alguem@mail.invalid"));
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("alguem@mail.localhost"));
    }

    @Test
    @DisplayName("Case e espaços não escapam da regra")
    void shouldNormalizeBeforeChecking() {
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("QA.LEITOR@TEST.COM"));
        assertTrue(ReservedTestDomainPolicy.isReservedTestDomain("qa.leitor@test.com "));
    }

    @Test
    @DisplayName("E-mail real não é bloqueado")
    void shouldAllowRealDomains() {
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain("sopraimvuu1@live.com"));
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain("jennwill649@gmail.com"));
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain("contato@manganetworking.com.br"));
        // "teste.com.br" é domínio brasileiro comum: não é reservado.
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain("alguem@teste.com.br"));
    }

    @Test
    @DisplayName("Endereço malformado não é tratado como domínio reservado")
    void shouldIgnoreMalformedAddresses() {
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain(null));
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain(""));
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain("sem-arroba"));
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain("@test.com"));
        assertFalse(ReservedTestDomainPolicy.isReservedTestDomain("alguem@"));
    }
}
