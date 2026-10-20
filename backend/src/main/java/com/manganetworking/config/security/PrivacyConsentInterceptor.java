package com.manganetworking.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.user.PrivacyComplianceService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
public class PrivacyConsentInterceptor implements HandlerInterceptor {
    private final ObjectProvider<UserRepository> userRepositories;
    private final ObjectProvider<PrivacyComplianceService> privacyComplianceServices;
    private final ObjectMapper objectMapper;

    public PrivacyConsentInterceptor(ObjectProvider<UserRepository> userRepositories,
                                     ObjectProvider<PrivacyComplianceService> privacyComplianceServices,
                                     ObjectMapper objectMapper) {
        this.userRepositories = userRepositories;
        this.privacyComplianceServices = privacyComplianceServices;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;
        var session = SecurityContextUtils.getCurrentSession().orElse(null);
        if (session == null || isConsentRecoveryRoute(request)) return true;

        UserRepository userRepository = userRepositories.getIfAvailable();
        PrivacyComplianceService privacyComplianceService = privacyComplianceServices.getIfAvailable();
        if (userRepository == null || privacyComplianceService == null) return true;
        var user = userRepository.findById(session.userId()).orElse(null);
        if (user == null || !privacyComplianceService.consentRequired(user)) return true;

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
