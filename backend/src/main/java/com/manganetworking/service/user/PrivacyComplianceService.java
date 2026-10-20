package com.manganetworking.service.user;

import com.manganetworking.domain.relational.UserEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PrivacyComplianceService {
    private final JdbcTemplate jdbcTemplate;
    private final String currentPolicyVersion;

    public PrivacyComplianceService(
            JdbcTemplate jdbcTemplate,
            @Value("${platform.privacy.policy-version:2026-10-v1}") String currentPolicyVersion) {
        this.jdbcTemplate = jdbcTemplate;
        this.currentPolicyVersion = currentPolicyVersion;
    }

    public String currentPolicyVersion() {
        return currentPolicyVersion;
    }

    public boolean consentRequired(UserEntity user) {
        return user.getPrivacyPolicyVersion() == null
                || !currentPolicyVersion.equals(user.getPrivacyPolicyVersion());
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
