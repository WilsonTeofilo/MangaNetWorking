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

            helper.setText(buildHtmlEmail(otpCode, purpose), true);

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
            helper.setText(buildPasswordResetEmail(resetUrl, expiresInMinutes), true);

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

    /**
     * E-mail de 2FA na identidade visual do MangaNetWorking ("Banca de Rua"): fundo ink, bloco
     * amarelo com o selo MN, código em caixas quadradas e aviso de segurança.
     */
    private String buildHtmlEmail(String otpCode, String purpose) {
        String purposeDescription = switch (purpose.toUpperCase()) {
            case "AUTENTICACAO_2FA" -> "entrar na sua conta";
            default -> "confirmar a alteração da sua chave PIX de recebimento";
        };

        String codeBoxes = codeBoxes(otpCode);

        return """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>MangaNetWorking — Código de Segurança</title>
        <style>
          body { margin: 0; padding: 0; background-color: #0B0B0C; color: #F4EFE3;
                 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .wrap { padding: 24px 12px; }
          .card { max-width: 520px; margin: 0 auto; background-color: #151517;
                  border: 2px solid #34343A; border-top: 8px solid #FFD400; }
          .head { background-color: #FFD400; color: #0B0B0C; padding: 18px 24px; display: flex; align-items: center; gap: 12px; }
          .mark { width: 40px; height: 40px; background-color: #0B0B0C; color: #FFD400; font-weight: 900;
                  font-size: 18px; display: flex; align-items: center; justify-content: center;
                  border: 2px solid #0B0B0C; letter-spacing: -1px; }
          .brand { font-weight: 900; font-size: 18px; letter-spacing: 1px; text-transform: uppercase; }
          .body { padding: 24px; }
          .lead { font-size: 15px; line-height: 1.6; margin: 0 0 18px; color: #F4EFE3; }
          .boxes { display: flex; gap: 8px; margin: 0 0 18px; }
          .box { width: 46px; height: 56px; background-color: #0B0B0C; border: 2px solid #FFD400;
                 color: #FFD400; font-size: 30px; font-weight: 900; text-align: center; line-height: 52px; }
          .note { font-size: 13px; line-height: 1.6; color: #A9A59A; margin: 0 0 8px; }
          .alert { border: 2px solid #34343A; background-color: #0B0B0C; padding: 14px 16px; margin-top: 18px; }
          .alert p { font-size: 12px; line-height: 1.6; color: #A9A59A; margin: 0; }
          .alert strong { color: #FFD400; }
          .foot { border-top: 2px solid #34343A; padding: 14px 24px; }
          .foot p { font-size: 11px; line-height: 1.6; color: #6B6B6B; margin: 0; }
        </style>
        </head>
        <body>
        <div class="wrap">
          <div class="card">
            <div class="head">
              <div class="mark">MN</div>
              <div class="brand">MangaNetWorking</div>
            </div>
            <div class="body">
              <p class="lead">Use este código para <strong>{{PROP}}</strong>:</p>
              <div class="boxes">{{CODE}}</div>
              <p class="note">O código expira em <strong style="color:#F4EFE3">5 minutos</strong> e só pode ser usado uma vez.</p>
              <div class="alert">
                <p><strong>NÃO COMPARTILHE ESTE CÓDIGO.</strong> Se você não solicitou o acesso, ignore este e-mail com segurança — ninguém da MangaNetWorking pede esse código por telefone, chat ou mensagem.</p>
              </div>
            </div>
            <div class="foot">
              <p>A banca digital do mangá independente · 17% de taxa sobre membros e doações · 58% dos anúncios vão para o autor · sem intermediários.</p>
              <p>© 2026 MangaNetWorking. Obras originais protegidas.</p>
            </div>
          </div>
        </div>
        </body>
        </html>
        """
        .replace("{{PROP}}", purposeDescription)
        .replace("{{CODE}}", codeBoxes);
    }

    /** Recuperação de senha com a mesma identidade visual da banca. */
    private String buildPasswordResetEmail(String resetUrl, long expiresInMinutes) {
        return """
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>MangaNetWorking — Recuperação de senha</title>
        <style>
          body { margin: 0; padding: 0; background-color: #0B0B0C; color: #F4EFE3;
                 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          .wrap { padding: 24px 12px; }
          .card { max-width: 520px; margin: 0 auto; background-color: #151517;
                  border: 2px solid #34343A; border-top: 8px solid #FFD400; }
          .head { background-color: #FFD400; color: #0B0B0C; padding: 18px 24px; display: flex; align-items: center; gap: 12px; }
          .mark { width: 40px; height: 40px; background-color: #0B0B0C; color: #FFD400; font-weight: 900;
                  font-size: 18px; display: flex; align-items: center; justify-content: center;
                  border: 2px solid #0B0B0C; letter-spacing: -1px; }
          .brand { font-weight: 900; font-size: 18px; letter-spacing: 1px; text-transform: uppercase; }
          .body { padding: 24px; }
          .lead { font-size: 15px; line-height: 1.6; margin: 0 0 18px; color: #F4EFE3; }
          .cta { display: inline-block; background-color: #FFD400; color: #0B0B0C; text-decoration: none;
                 padding: 14px 20px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
                 border: 2px solid #0B0B0C; box-shadow: 4px 4px 0 #0B0B0C; }
          .alert { border: 2px solid #34343A; background-color: #0B0B0C; padding: 14px 16px; margin-top: 20px; }
          .alert p { font-size: 12px; line-height: 1.6; color: #A9A59A; margin: 0; }
          .alert strong { color: #FFD400; }
          .foot { border-top: 2px solid #34343A; padding: 14px 24px; }
          .foot p { font-size: 11px; line-height: 1.6; color: #6B6B6B; margin: 0; }
        </style>
        </head>
        <body>
        <div class="wrap">
          <div class="card">
            <div class="head">
              <div class="mark">MN</div>
              <div class="brand">MangaNetWorking</div>
            </div>
            <div class="body">
              <p class="lead">Recebemos uma solicitação para redefinir a senha da sua conta. O link abaixo expira em <strong style="color:#F4EFE3">{{MINUTES}} minutos</strong> e só pode ser usado uma vez.</p>
              <p><a class="cta" href="{{URL}}">Criar nova senha</a></p>
              <div class="alert">
                <p><strong>NÃO COMPARTILHE ESTE LINK.</strong> Se você não solicitou a alteração, ignore este e-mail — sua senha atual continua valendo.</p>
              </div>
            </div>
            <div class="foot">
              <p>A banca digital do mangá independente · 17% de taxa sobre membros e doações · 58% dos anúncios vão para o autor · sem intermediários.</p>
              <p>© 2026 MangaNetWorking. Obras originais protegidas.</p>
            </div>
          </div>
        </div>
        </body>
        </html>
        """
        .replace("{{MINUTES}}", String.valueOf(expiresInMinutes))
        .replace("{{URL}}", escapeHtmlAttribute(resetUrl));
    }

    /** O código em caixas quadradas (mesma leitura do campo OTP do site). */
    private String codeBoxes(String otpCode) {
        StringBuilder boxes = new StringBuilder();
        for (char digit : otpCode.toCharArray()) {
            boxes.append("<div class=\"box\">").append(digit).append("</div>");
        }
        return boxes.toString();
    }

    /** Endereço com bounce/complaint recorded: o envio é suprimido. */
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
                    .log("Falha ao consultar a lista de supressão; envio prosseguido");
            return false;
        }
        metrics.recordEmailDelivery("suppressed");
        log.atWarn().addKeyValue("event", "email_delivery")
                .addKeyValue("outcome", "suppressed")
                .addKeyValue("recipient", maskEmail(destination))
                .log("Envio suprimido: destinatário com bounce/complaint registrado");
        return true;
    }

    /** Escapa o valor para uso em atributo HTML do link de recuperação. */
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
