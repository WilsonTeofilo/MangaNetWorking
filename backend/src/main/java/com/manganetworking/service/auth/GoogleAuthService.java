package com.manganetworking.service.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * Serviço responsável por validar tokens OpenID Connect do Google Identity Services
 * e extrair claims verificadas do usuário autenticado.
 */
@Service
public class GoogleAuthService {

    private final String googleClientId;
    private final boolean googleStagingMockEnabled;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;

    @Autowired
    public GoogleAuthService(
            @Value("${GOOGLE_CLIENT_ID:}") String googleClientId,
            @Value("${google.auth.staging-mock-enabled:false}") boolean googleStagingMockEnabled
    ) {
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.googleStagingMockEnabled = googleStagingMockEnabled;
        this.googleIdTokenVerifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(this.googleClientId))
                .build();
    }

    public GoogleAuthService(String googleClientId) {
        this(googleClientId, false);
    }

    /**
     * Valida o token ID do Google e extrai as claims do leitor.
     *
     * @param token String JWT enviada pelo SDK do Google no frontend
     * @return Claims verificadas contendo email, sub, nome e foto
     * @throws SecurityException se o token for inválido, adulterado ou o e-mail não for verificado
     * @throws IllegalStateException se a integração não estiver configurada no ambiente
     */
    public GoogleTokenClaims verifyToken(String token) {
        GoogleIdToken idToken;

        if (googleStagingMockEnabled && token != null && token.startsWith("STAGING_GOOGLE_TOKEN:")) {
            String[] parts = token.split(":", 3);
            String mockEmail = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : "leitor.staging@manganetworking.com";
            String mockName = parts.length > 2 && !parts[2].isBlank() ? parts[2].trim() : "Leitor Staging Google";
            GoogleIdToken.Payload mockPayload = new GoogleIdToken.Payload();
            mockPayload.setEmail(mockEmail);
            mockPayload.setEmailVerified(true);
            mockPayload.setSubject("staging-google-sub-" + mockEmail.hashCode());
            mockPayload.set("name", mockName);
            mockPayload.set("picture", "/api/storage/avatar-default.png");
            idToken = new GoogleIdToken(new com.google.api.client.json.webtoken.JsonWebSignature.Header(), mockPayload, new byte[0], new byte[0]);
        } else {
            if (googleClientId.isBlank()) {
                throw new IllegalStateException("Login Google indisponível: GOOGLE_CLIENT_ID não configurado.");
            }
            try {
                idToken = googleIdTokenVerifier.verify(token);
            } catch (GeneralSecurityException ex) {
                throw new SecurityException("Token Google inválido", ex);
            } catch (IOException ex) {
                throw new IllegalStateException("Não foi possível validar a identidade Google agora.", ex);
            } catch (IllegalArgumentException ex) {
                throw new SecurityException("Token Google inválido", ex);
            }
        }

        if (idToken == null) {
            throw new SecurityException("Token Google inválido");
        }

        GoogleIdToken.Payload claims = idToken.getPayload();
        String email = claims.getEmail();
        String subject = claims.getSubject();
        if (!Boolean.TRUE.equals(claims.getEmailVerified())
                || email == null || email.isBlank()
                || subject == null || subject.isBlank()) {
            throw new SecurityException("Token Google inválido");
        }

        return new GoogleTokenClaims(
                email,
                subject,
                (String) claims.get("name"),
                (String) claims.get("picture")
        );
    }

    public record GoogleTokenClaims(
            String email,
            String subject,
            String name,
            String picture
    ) {}
}
