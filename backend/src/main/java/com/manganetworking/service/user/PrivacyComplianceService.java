package com.manganetworking.service.user;

import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PrivacyComplianceService {
    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final String currentPolicyVersion;

    public PrivacyComplianceService(
            JdbcTemplate jdbcTemplate,
            UserRepository userRepository,
            @Value("${platform.privacy.policy-version:2026-10-v1}") String currentPolicyVersion) {
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
        this.currentPolicyVersion = currentPolicyVersion;
    }

    public String currentPolicyVersion() {
        return currentPolicyVersion;
    }

    public boolean consentRequired(UserEntity user) {
        return user.getPrivacyPolicyVersion() == null
                || !currentPolicyVersion.equals(user.getPrivacyPolicyVersion());
    }

    /**
     * Verifica se o consentimento de privacidade é obrigatório para o usuário com o UUID informado.
     * Preferir este método em vez de carregar a entidade completa quando só o userId está disponível
     * (ex.: interceptors de infraestrutura), eliminando a necessidade de injetar UserRepository
     * fora da camada de serviço.
     */
    @Transactional(readOnly = true)
    public boolean consentRequiredForUser(UUID userId) {
        return userRepository.findById(userId)
                .map(this::consentRequired)
                .orElse(false);
    }

    @Transactional
    public void recordConsent(UUID userId, String version, String purpose, String remoteIp, String userAgent) {
        jdbcTemplate.update("""
                INSERT INTO privacy_consent_events (user_id, policy_version, purpose, remote_ip, user_agent)
                VALUES (?, ?, ?, ?, ?)
                """, userId, version, purpose, truncate(remoteIp, 64), truncate(userAgent, 500));
    }

    @Transactional
    public void auditRequest(UUID userId, String requestType, String remoteIp) {
        jdbcTemplate.update("""
                INSERT INTO privacy_request_audit (user_id, request_type, remote_ip)
                VALUES (?, ?, ?)
                """, userId, requestType, truncate(remoteIp, 64));
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
