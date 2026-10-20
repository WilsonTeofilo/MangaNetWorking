package com.manganetworking.service.mfa;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.config.observability.SecurityObservabilityMetrics;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

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
    private final SecurityObservabilityMetrics metrics;

    @Autowired
    public SmtpMfaNotificationSender(JavaMailSender mailSender, PlatformProperties properties,
                                    SecurityObservabilityMetrics metrics) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.metrics = metrics;
    }

    public SmtpMfaNotificationSender(JavaMailSender mailSender, PlatformProperties properties) {
        this(mailSender, properties, new SecurityObservabilityMetrics(new SimpleMeterRegistry()));
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
            // OTP não deve aparecer em previews/notificações de e-mail.
            helper.setSubject("MangaNetWorking — Código de Segurança");

            String htmlBody = buildHtmlEmail(otpCode, purpose);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            metrics.recordEmailDelivery("sent");
            log.atInfo().addKeyValue("event", "mfa_email_delivery")
                    .addKeyValue("outcome", "sent").addKeyValue("recipient", maskEmail(destination))
                    .log("E-mail de verificação enviado");
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            metrics.recordEmailDelivery("failed");
            log.atError().addKeyValue("event", "mfa_email_delivery")
                    .addKeyValue("outcome", "failed").addKeyValue("recipient", maskEmail(destination))
                    .addKeyValue("error_type", e.getClass().getSimpleName())
                    .log("Falha ao enviar e-mail 2FA");
            throw new IllegalStateException("Não foi possível enviar o e-mail de verificação. Tente novamente em instantes.", e);
        }
    }

    @Override
    public void sendPasswordResetLink(String destination, String resetUrl, long expiresInMinutes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(properties.getMail().getFromAddress(), properties.getMail().getFromName());
            helper.setTo(destination);
            helper.setSubject("MangaNetWorking — Recuperação de senha");
            helper.setText("""
                    <!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;background:#0b0c10;color:#f4efe3;padding:24px">
                    <main style="max-width:480px;margin:auto;background:#1f2833;padding:28px;border:1px solid #45a29e">
                    <h1 style="color:#66fcf1">MangaNetWorking</h1><p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                    <p><a href="%s" style="color:#0b0c10;background:#66fcf1;padding:12px 18px;display:inline-block">Criar nova senha</a></p>
                    <p>Este link expira em %d minutos e só pode ser usado uma vez.</p>
                    <p>Se você não solicitou a alteração, ignore esta mensagem. Sua senha não será modificada.</p>
                    </main></body></html>
                    """.formatted(escapeHtmlAttribute(resetUrl), expiresInMinutes), true);
            mailSender.send(message);
            metrics.recordEmailDelivery("sent");
            log.atInfo().addKeyValue("event", "password_reset_email_delivery")
                    .addKeyValue("outcome", "sent").addKeyValue("recipient", maskEmail(destination))
                    .log("E-mail de recuperação enviado");
        } catch (MessagingException | UnsupportedEncodingException | MailException exception) {
            metrics.recordEmailDelivery("failed");
            log.atError().addKeyValue("event", "password_reset_email_delivery")
                    .addKeyValue("outcome", "failed").addKeyValue("recipient", maskEmail(destination))
                    .addKeyValue("error_type", exception.getClass().getSimpleName())
                    .log("Falha ao enviar e-mail de recuperação");
            throw new IllegalStateException("Falha no envio de recuperação.", exception);
        }
    }

    private String escapeHtmlAttribute(String value) {
        return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String buildHtmlEmail(String otpCode, String purpose) {
        String purposeDescription = switch (purpose.toUpperCase()) {
            case "AUTENTICACAO_2FA" -> "acesso à sua conta";
            default -> "confirmação da alteração de chave PIX de recebimento";
        };

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
