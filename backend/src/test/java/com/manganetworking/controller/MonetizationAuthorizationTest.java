package com.manganetworking.controller;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.config.security.SecurityConfig;
import com.manganetworking.domain.enums.TransactionType;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.FinancialLedgerEntity;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.service.monetization.MonetizationService;
import com.manganetworking.service.session.SessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Autorização do extrato financeiro do autor.
 *
 * <p>Regressão do vazamento crítico: {@code GET /api/monetization/ledger/{creatorId}} expunha o
 * ledger de QUALQUER criador a qualquer sessão autenticada e serializava a entidade JPA com
 * CPF e chave PIX decifrados. Aqui garantimos que só o próprio autor consulta e que a resposta
 * usa um DTO sem dados pessoais.</p>
 */
@WebMvcTest(controllers = MonetizationController.class)
@Import({SecurityConfig.class, MonetizationAuthorizationTest.PropsTestConfig.class})
@DisplayName("Extrato financeiro — autorização e não exposição de dados pessoais")
class MonetizationAuthorizationTest {

    @TestConfiguration
    static class PropsTestConfig {
        @Bean
        PlatformProperties platformProperties() {
            return new PlatformProperties();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MonetizationService monetizationService;

    @MockitoBean
    private FinancialLedgerRepository ledgerRepository;

    // Bean Filter incluído no slice @WebMvcTest; depende deste serviço.
    @MockitoBean
    private SessionService sessionService;

    private static Authentication creatorAuth(UUID userId, UUID creatorId) {
        SessionService.UserSession session = new SessionService.UserSession(
                "sess-" + userId, userId, "autor@mn.dev", "Autor Teste",
                true, false, creatorId, "autor", Instant.now().plusSeconds(3600)
        );
        return new UsernamePasswordAuthenticationToken(
                session, null, List.of(new SimpleGrantedAuthority("ROLE_CREATOR")));
    }

    private static FinancialLedgerEntity ledgerEntryWithSensitiveCreator(UUID creatorId) {
        CreatorEntity creator = new CreatorEntity();
        creator.setId(creatorId);
        creator.setDocumentCpf("123.456.789-00");
        creator.setPixKey("pix-secreto@email.com");

        FinancialLedgerEntity entry = new FinancialLedgerEntity();
        entry.setId(UUID.randomUUID());
        entry.setCreator(creator);
        entry.setTransactionType(TransactionType.DOACAO);
        entry.setGrossAmountBrl(new BigDecimal("10.00"));
        entry.setFeeRatePercent(new BigDecimal("17.00"));
        entry.setPlatformFeeBrl(new BigDecimal("1.70"));
        entry.setCreatorNetBrl(new BigDecimal("8.30"));
        entry.setWalletBalanceAfterBrl(new BigDecimal("8.30"));
        entry.setDescription("Doação de leitor");
        return entry;
    }

    @Test
    @DisplayName("Anônimo não acessa o extrato → 401")
    void anonymousCannotReadLedger() throws Exception {
        mockMvc.perform(get("/api/monetization/ledger/{creatorId}", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Leitor autenticado (sem criador na sessão) não acessa o extrato → 403")
    void readerWithoutCreatorSessionCannotReadLedger() throws Exception {
        SessionService.UserSession reader = new SessionService.UserSession(
                "sess-reader", UUID.randomUUID(), "leitor@mn.dev", "Leitor", false, false, null, null,
                Instant.now().plusSeconds(3600));
        Authentication auth = new UsernamePasswordAuthenticationToken(
                reader, null, List.of(new SimpleGrantedAuthority("ROLE_READER")));

        mockMvc.perform(get("/api/monetization/ledger/{creatorId}", UUID.randomUUID())
                        .with(authentication(auth)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Criador não acessa o extrato de OUTRO criador → 403")
    void creatorCannotReadAnotherCreatorsLedger() throws Exception {
        UUID sessionCreatorId = UUID.randomUUID();
        UUID otherCreatorId = UUID.randomUUID();

        mockMvc.perform(get("/api/monetization/ledger/{creatorId}", otherCreatorId)
                        .with(authentication(creatorAuth(UUID.randomUUID(), sessionCreatorId))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Criador dono acessa seu extrato → 200 sem CPF/chave PIX na resposta")
    void ownerReadsLedgerWithoutPersonalData() throws Exception {
        UUID creatorId = UUID.randomUUID();
        FinancialLedgerEntity entry = ledgerEntryWithSensitiveCreator(creatorId);
        when(ledgerRepository.findAllByCreatorIdOrderByCreatedAtDesc(creatorId)).thenReturn(List.of(entry));

        mockMvc.perform(get("/api/monetization/ledger/{creatorId}", creatorId)
                        .with(authentication(creatorAuth(UUID.randomUUID(), creatorId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(entry.getId().toString()))
                .andExpect(jsonPath("$[0].creatorNetBrl").value(8.30))
                .andExpect(jsonPath("$[0].creator").doesNotExist())
                .andExpect(jsonPath("$[0].pixKey").doesNotExist())
                .andExpect(jsonPath("$[0].documentCpf").doesNotExist())
                .andExpect(content().string(not(containsString("pix-secreto@email.com"))))
                .andExpect(content().string(not(containsString("123.456.789-00"))));
    }

    @Test
    @DisplayName("Anônimo não pode doar → 401")
    void anonymousCannotDonate() throws Exception {
        mockMvc.perform(post("/api/monetization/donate")
                        .contentType("application/json")
                        .content("{\"creatorId\":\"" + UUID.randomUUID() + "\",\"amountBrl\":10.00}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Anônimo não pode assinar VIP → 401")
    void anonymousCannotSubscribeVip() throws Exception {
        mockMvc.perform(post("/api/monetization/vip/subscribe")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
