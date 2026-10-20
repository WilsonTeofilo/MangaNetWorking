package com.manganetworking.service.mfa;

public interface MfaNotificationSender {
    void sendOtp(String destination, String otpCode, String purpose);

    void sendPasswordResetLink(String destination, String resetUrl, long expiresInMinutes);
}
