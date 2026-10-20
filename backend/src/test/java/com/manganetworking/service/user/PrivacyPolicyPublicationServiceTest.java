package com.manganetworking.service.user;

import com.manganetworking.service.user.dto.PrivacyPolicyDocumentDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PrivacyPolicyPublicationServiceTest {

    private static final String VERSION = "2026-10-v1";

    private final PrivacyComplianceService privacyComplianceService = mock(PrivacyComplianceService.class);

    @Test
    @DisplayName("Sem documento instalado a política não é publicada")
    void doesNotPublishWhenDocumentIsMissing() {
        when(privacyComplianceService.currentPolicyVersion()).thenReturn(VERSION);
        PrivacyPolicyPublicationService service = new PrivacyPolicyPublicationService(
                privacyComplianceService, new DefaultResourceLoader(), "", "legal/privacy-policy");

        Optional<PrivacyPolicyDocumentDto> document = service.publishedDocument();

        assertTrue(document.isEmpty(), "Documento ausente não pode ser publicado");
        assertEquals(VERSION, service.currentVersion());
    }

    @Test
    @DisplayName("Documento aprovado é publicado com metadados e hash estável")
    void publishesApprovedDocument() throws Exception {
        when(privacyComplianceService.currentPolicyVersion()).thenReturn(VERSION);
        Path file = Files.createTempFile("politica", ".md");
        Files.writeString(file, """
                ---
                version: 2026-10-v1
                effectiveDate: 2026-10-01
                approvedBy: Encarregado de Dados
                approvalReference: ATA-2026-001
                ---
                # Política de Privacidade

                Texto oficial aprovado.
                """, StandardCharsets.UTF_8);

        PrivacyPolicyPublicationService service = new PrivacyPolicyPublicationService(
                privacyComplianceService, new DefaultResourceLoader(), file.toString(), "legal/privacy-policy");

        PrivacyPolicyDocumentDto document = service.publishedDocument().orElseThrow();

        assertEquals(VERSION, document.version());
        assertEquals("2026-10-01", document.effectiveDate());
        assertEquals("Encarregado de Dados", document.approvedBy());
        assertEquals("ATA-2026-001", document.approvalReference());
        assertEquals(64, document.sha256().length());
        assertTrue(document.content().startsWith("# Política de Privacidade"));
        assertFalse(document.content().contains("approvedBy"), "Front matter não deve vazar para o conteúdo público");
        Files.deleteIfExists(file);
    }

    @Test
    @DisplayName("Documento com versão divergente da exigida não é publicado")
    void rejectsVersionMismatch() throws Exception {
        when(privacyComplianceService.currentPolicyVersion()).thenReturn(VERSION);
        Path file = Files.createTempFile("politica", ".md");
        Files.writeString(file, """
                ---
                version: 2025-01-v1
                effectiveDate: 2025-01-01
                approvedBy: Encarregado de Dados
                approvalReference: ATA-2025-001
                ---
                # Política antiga
                """, StandardCharsets.UTF_8);

        PrivacyPolicyPublicationService service = new PrivacyPolicyPublicationService(
                privacyComplianceService, new DefaultResourceLoader(), file.toString(), "legal/privacy-policy");

        assertTrue(service.publishedDocument().isEmpty());
        Files.deleteIfExists(file);
    }

    @Test
    @DisplayName("Documento com BOM do Windows é lido normalmente")
    void publishesDocumentWithByteOrderMark() throws Exception {
        when(privacyComplianceService.currentPolicyVersion()).thenReturn(VERSION);
        Path file = Files.createTempFile("politica-bom", ".md");
        Files.writeString(file, "\uFEFF" + """
                ---
                version: 2026-10-v1
                effectiveDate: 2026-10-01
                approvedBy: Encarregado de Dados
                approvalReference: ATA-2026-001
                ---
                # Política de Privacidade

                Texto oficial aprovado.
                """, StandardCharsets.UTF_8);

        PrivacyPolicyPublicationService service = new PrivacyPolicyPublicationService(
                privacyComplianceService, new DefaultResourceLoader(), file.toString(), "legal/privacy-policy");

        assertTrue(service.publishedDocument().isPresent(), "BOM não pode impedir a publicação");
        Files.deleteIfExists(file);
    }

    @Test
    @DisplayName("Documento incompleto ou com segredo não é publicado")
    void rejectsIncompleteOrLeakyDocument() throws Exception {
        when(privacyComplianceService.currentPolicyVersion()).thenReturn(VERSION);
        Path incomplete = Files.createTempFile("politica", ".md");
        Files.writeString(incomplete, """
                ---
                version: 2026-10-v1
                effectiveDate: 2026-10-01
                ---
                # Política sem aprovação
                """, StandardCharsets.UTF_8);
        PrivacyPolicyPublicationService service = new PrivacyPolicyPublicationService(
                privacyComplianceService, new DefaultResourceLoader(), incomplete.toString(), "legal/privacy-policy");
        assertTrue(service.publishedDocument().isEmpty(), "Documento sem approvedBy/approvalReference não pode ser publicado");
        Files.deleteIfExists(incomplete);

        Path leaky = Files.createTempFile("politica", ".md");
        Files.writeString(leaky, """
                ---
                version: 2026-10-v1
                effectiveDate: 2026-10-01
                approvedBy: Encarregado de Dados
                approvalReference: ATA-2026-001
                ---
                # Política

                senha: super-secreta
                """, StandardCharsets.UTF_8);
        PrivacyPolicyPublicationService leakyService = new PrivacyPolicyPublicationService(
                privacyComplianceService, new DefaultResourceLoader(), leaky.toString(), "legal/privacy-policy");
        assertTrue(leakyService.publishedDocument().isEmpty(), "Documento com material sensível não pode ser publicado");
        Files.deleteIfExists(leaky);
    }
}
