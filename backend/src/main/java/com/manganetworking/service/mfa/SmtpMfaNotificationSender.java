package com.manganetworking.service.mfa;

import com.manganetworking.config.properties.PlatformProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;

/**
 * Adaptador de envio de e-mails de segurança 2FA via protocolo SMTP padrão (RFC 5321).
 * <p>
 * Suporta servidores SMTP reais de produção (Resend, Brevo, AWS SES, Gmail com senha de app)
 * e o servidor de teste local Mailpit.
 * Ativado quando {@code platform.mail.enabled=true}.
 * </p>
 */
@Service
@ConditionalOnProperty(name = "platform.mail.enabled", havingValue = "true")
public class SmtpMfaNotificationSender implements MfaNotificationSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpMfaNotificationSender.class);

    private final JavaMailSender mailSender;
    private final PlatformProperties properties;

    public SmtpMfaNotificationSender(JavaMailSender mailSender, PlatformProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    @Override
    public void sendOtp(String destination, String otpCode, String purpose) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromAddress = properties.getMail().getFromAddress();
            String fromName = properties.getMail().getFromName();

            helper.setFrom(fromAddress, fromName);
            helper.setTo(destination);
            helper.setSubject("MangaNetWorking — Código de Segurança: " + otpCode);

            String htmlBody = buildHtmlEmail(otpCode, purpose);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("[SMTP-2FA] E-mail de verificação enviado com sucesso para: {}", maskEmail(destination));
        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("[SMTP-2FA] Falha ao enviar e-mail 2FA para {}: {}", maskEmail(destination), e.getMessage());
            throw new IllegalStateException("Não foi possível enviar o e-mail de verificação. Tente novamente em instantes.", e);
        }
    }

    private String buildHtmlEmail(String otpCode, String purpose) {
        String purposeDescription = "AUTENTICACAO_2FA".equalsIgnoreCase(purpose)
                ? "acesso à sua conta"
                : "confirmação da alteração de chave PIX de recebimento";

        return """
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c10; color: #e0e2ec; margin: 0; padding: 24px; }
                .card { background-color: #1f2833; max-width: 480px; margin: 0 auto; border-radius: 8px; border: 1px solid #45a29e; padding: 32px; }
                .logo { font-size: 20px; font-weight: 800; color: #66fcf1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
                .code-box { background-color: #0b0c10; border: 2px dashed #66fcf1; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0; }
                .code { font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #66fcf1; }
                .footer { font-size: 12px; color: #8892b0; margin-top: 24px; border-top: 1px solid #2e3c4d; padding-top: 16px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="logo">MangaNetWorking</div>
                <p>Olá,</p>
                <p>Seu código de verificação para <strong>%s</strong> é:</p>
                <div class="code-box">
                  <span class="code">%s</span>
                </div>
                <p>Este código expira em <strong>5 minutos</strong> e pode ser usado apenas uma vez.</p>
                <div class="footer">
                  Se você não solicitou este código, por favor ignore este e-mail com segurança. Nunca compartilhe este código com ninguém.
                </div>
              </div>
            </body>
            </html>
            """.formatted(purposeDescription, otpCode);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        String user = parts[0];
        String domain = parts[1];
        if (user.length() <= 2) return user.charAt(0) + "***@" + domain;
        return user.substring(0, 2) + "***@" + domain;
    }
}
