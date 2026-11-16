package com.manganetworking.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.service.user.PrivacyComplianceService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

/**
 * Interceptor que bloqueia requisições autenticadas quando o usuário possui uma versão
 * desatualizada da política de privacidade. Retorna HTTP 428 (Precondition Required) com
 * o payload {@code {"error":"PRIVACY_CONSENT_REQUIRED","currentPolicyVersion":"..."}} para
 * que o frontend exiba a tela de re-aceite obrigatória.
 *
 * <p>Usa {@code ObjectProvider<PrivacyComplianceService>} (injeção lazy) para evitar ciclo
 * de dependência circular no boot: o contexto de segurança inicializa antes do contexto JPA.
 * O {@link PrivacyComplianceService} encapsula o acesso ao {@code UserRepository} — o
 * interceptor nunca injeta repositórios JPA diretamente.</p>
 */
@Component
public class PrivacyConsentInterceptor implements HandlerInterceptor {
    private final ObjectProvider<PrivacyComplianceService> privacyComplianceServices;
    private final ObjectMapper objectMapper;

    public PrivacyConsentInterceptor(ObjectProvider<PrivacyComplianceService> privacyComplianceServices,
                                     ObjectMapper objectMapper) {
        this.privacyComplianceServices = privacyComplianceServices;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;
        var session = SecurityContextUtils.getCurrentSession().orElse(null);
        if (session == null || isConsentRecoveryRoute(request)) return true;

        PrivacyComplianceService privacyComplianceService = privacyComplianceServices.getIfAvailable();
        if (privacyComplianceService == null) return true;

        if (!privacyComplianceService.consentRequiredForUser(session.userId())) return true;

        response.setStatus(428);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-store");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                "error", "PRIVACY_CONSENT_REQUIRED",
                "currentPolicyVersion", privacyComplianceService.currentPolicyVersion())));
        return false;
    }

    private boolean isConsentRecoveryRoute(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return ("GET".equals(method) && ("/api/auth/me".equals(path) || "/api/auth/policy".equals(path)
                || "/api/users/me/export".equals(path)))
                || ("POST".equals(method) && ("/api/auth/logout".equals(path)
                || "/api/users/me/consent".equals(path)))
                || ("DELETE".equals(method) && "/api/users/me".equals(path));
    }
}
