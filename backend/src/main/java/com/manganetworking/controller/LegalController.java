package com.manganetworking.controller;

import com.manganetworking.service.user.PrivacyPolicyPublicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Documentos legais públicos.
 * <p>
 * A Política de Privacidade só é devolvida depois do procedimento controlado de publicação.
 * Enquanto o texto oficial não estiver aprovado e instalado, a rota responde
 * {@code 404 POLICY_NOT_PUBLISHED} — a interface pode avisar que o documento está em
 * publicação, sem inventar texto.
 * </p>
 */
@RestController
@RequestMapping("/api/legal")
public class LegalController {

    private final PrivacyPolicyPublicationService publicationService;

    public LegalController(PrivacyPolicyPublicationService publicationService) {
        this.publicationService = publicationService;
    }

    @GetMapping("/privacy-policy")
    public ResponseEntity<?> privacyPolicy() {
        return publicationService.publishedDocument()
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "code", "POLICY_NOT_PUBLISHED",
                        "version", publicationService.currentVersion(),
                        "message", "O texto oficial da Política de Privacidade ainda não foi publicado."
                )));
    }
}
