package com.manganetworking.service.mfa;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.config.observability.SecurityObservabilityMetrics;
import com.manganetworking.service.email.EmailSuppressionService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.UnsupportedEncodingException;

/**
 * Adaptador de envio de e-mails de segurança 2FA via protocolo SMTP padrão (RFC 5321).
 * <p>Suporta servidores SMTP reais de produção (Resend, Brevo, AWS SES, Gmail com senha de app)
 * e o servidor de teste local Mailpit.
 * Ativado quando {@code platform.mail.enabled=true}.
 * </p>
 *
 * <p><b>Identidade visual:</b> o e-mail usa a mesma marca do site ("Banca de Rua" — ink, papel e
 * amarelo do MangaNetWorking), com o selo MN, o código em caixas quadradas e o bloco de aviso.
 * O tema antigo (azul/ciano, genérico) foi removido por estar fora da marca.</p>
 */
@Component
@ConditionalOnProperty(name = "platform.mail.enabled", havingValue = "true")
public class SmtpMfaNotificationSender implements MfaNotificationSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpMfaNotificationSender.class);

    private final JavaMailSender mailSender;
    private final PlatformProperties properties;
    private final SecurityObservabilityMetrics metrics;
    private final EmailSuppressionService suppressionService;

    @Autowired
    public SmtpMfaNotificationSender(JavaMailSender mailSender, PlatformProperties properties,
                                    SecurityObservabilityMetrics metrics,
                                    EmailSuppressionService suppressionService) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.metrics = metrics;
        this.suppressionService = suppressionService;
    }

    public SmtpMfaNotificationSender(JavaMailSender mailSender, PlatformProperties properties) {
        this(mailSender, properties, new SecurityObservabilityMetrics(new SimpleMeterRegistry()), null);
    }

    @Override
    public void sendOtp(String destination, String otpCode, String purpose) {
        if (isSuppressed(destination)) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromAddress = properties.getMail().getFromAddress();
            String fromName = properties.getMail().getFromName();

            helper.setFrom(fromAddress, fromName);
            helper.setTo(destination);
            // OTP não deve aparecer em previews/notificações de e-mail.
            helper.setSubject("MangaNetWorking — Código de Segurança");

            helper.setText(MangaEmailTemplates.otpEmail(otpCode, purposeDescription(otpCode, purpose)), true);

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
        if (isSuppressed(destination)) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(properties.getMail().getFromAddress(), properties.getMail().getFromName());
            helper.setTo(destination);
            helper.setSubject("MangaNetWorking — Recuperação de senha");
            helper.setText(MangaEmailTemplates.passwordResetEmail(escapeHtmlAttribute(resetUrl), expiresInMinutes), true);

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

    /** Rotulo do motivo do codigo, no tom da marca. */
    private String purposeDescription(String otpCode, String purpose) {
        return switch (purpose == null ? "" : purpose.toUpperCase()) {
            case "AUTENTICACAO_2FA" -> "entrar na sua conta";
            default -> "confirmar a alteraÃ§Ã£o da sua chave PIX de recebimento";
        };
    }

    /** Endereco com bounce/complaint registrado: o envio e suprimido. */
    private boolean isSuppressed(String destination) {
        if (suppressionService == null) {
            return false;
        }
        try {
            if (!suppressionService.isSuppressed(destination)) {
                return false;
            }
        } catch (RuntimeException e) {
            log.atWarn().addKeyValue("event", "email_suppression_check")
                    .addKeyValue("outcome", "failed")
                    .log("Falha ao consultar a lista de supressao; envio prosseguido");
            return false;
        }
        metrics.recordEmailDelivery("suppressed");
        log.atWarn().addKeyValue("event", "email_delivery")
                .addKeyValue("outcome", "suppressed")
                .addKeyValue("recipient", maskEmail(destination))
                .log("Envio suprimido: destinatario com bounce/complaint registrado");
        return true;
    }

    /** Escapa o valor para uso em atributo HTML do link de recuperacao. */
    private String escapeHtmlAttribute(String value) {
        return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
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
