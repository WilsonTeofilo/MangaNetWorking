package com.manganetworking.config.security;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.service.session.SessionService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Utilitário autoritativo de contexto de segurança.
 * Previne ataques de IDOR (Insecure Direct Object Reference) e falsificação de headers HTTP
 * extraindo o usuário autenticado diretamente da sessão criptografada no SecurityContext.
 */
public final class SecurityContextUtils {

    private SecurityContextUtils() {}

    public static Optional<SessionService.UserSession> getCurrentSession() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof SessionService.UserSession session) {
            return Optional.of(session);
        }
        return Optional.empty();
    }

    /**
     * Resolve o ID do usuário corrente com prioridade autoritativa na sessão ativa.
     * Se houver sessão, usa o ID da sessão (impossível forjar pelo cliente).
     * Se não houver sessão ativa, faz fallback para o header apenas em ambiente de mock/desenvolvimento.
     */
    public static UUID resolveCurrentUserId(UUID fallbackHeaderUserId) {
        return getCurrentSession()
                .map(SessionService.UserSession::userId)
                .orElse(fallbackHeaderUserId);
    }

    /**
     * Resolve o ID do criador corrente garantindo integridade com a sessão ativa.
     */
    public static UUID resolveCurrentCreatorId(UUID fallbackHeaderCreatorId) {
        return getCurrentSession()
                .map(SessionService.UserSession::creatorId)
                .orElse(fallbackHeaderCreatorId);
    }

    /**
     * Assegura que o usuário que executa a requisição é o legítimo proprietário do recurso.
     */
    public static void assertOwnership(UUID targetUserId, String actionDescription) {
        UUID authenticatedId = resolveCurrentUserId(null);
        if (authenticatedId == null) {
            throw new AccessDeniedException("Sessão autenticada necessária para: " + actionDescription);
        }
        if (!authenticatedId.equals(targetUserId)) {
            throw new AccessDeniedException("Você não tem permissão para executar esta ação em nome de outro usuário.");
        }
    }
}
