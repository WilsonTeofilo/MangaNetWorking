package com.manganetworking.service.mfa;

import com.manganetworking.config.properties.PlatformProperties;
import jakarta.mail.Multipart;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SmtpMfaNotificationSenderTest {

    @Test
    void shouldKeepOtpOutOfSubjectAndSendItInMessageBody() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        JavaMailSenderImpl messageFactory = new JavaMailSenderImpl();
        when(mailSender.createMimeMessage()).thenAnswer(ignored -> messageFactory.createMimeMessage());
        PlatformProperties properties = new PlatformProperties();
        properties.getMail().setFromAddress("nao-responda@example.com");
        properties.getMail().setFromName("MangaNetWorking");
        SmtpMfaNotificationSender sender = new SmtpMfaNotificationSender(mailSender, properties);

        sender.sendOtp("reader@example.com", "123456", "AUTENTICACAO_2FA");

        var captor = org.mockito.ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage sent = captor.getValue();
        assertEquals("MangaNetWorking — Código de Segurança", sent.getSubject());
        assertFalse(sent.getSubject().contains("123456"));
        assertEquals("reader@example.com", sent.getAllRecipients()[0].toString());
        Object content = sent.getContent();
        assertInstanceOf(Multipart.class, content);
        String body = extractText((Multipart) content);
        // O código vai no corpo em caixas quadradas (identidade do site) e nunca no assunto.
        assertTrue(body.contains("class=\"box\""));
        assertTrue(body.contains(">1</div>") && body.contains(">6</div>"));
        assertTrue(body.contains("entrar na sua conta"));
    }

    @Test
    void shouldSendPasswordResetLinkInBrandedMessage() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        JavaMailSenderImpl messageFactory = new JavaMailSenderImpl();
        when(mailSender.createMimeMessage()).thenAnswer(ignored -> messageFactory.createMimeMessage());
        PlatformProperties properties = new PlatformProperties();
        properties.getMail().setFromAddress("nao-responda@example.com");
        properties.getMail().setFromName("MangaNetWorking");
        SmtpMfaNotificationSender sender = new SmtpMfaNotificationSender(mailSender, properties);

        sender.sendPasswordResetLink("reader@example.com", "https://app.example.invalid/reset-password#token=opaque-token", 30);

        var captor = org.mockito.ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage sent = captor.getValue();
        assertEquals("MangaNetWorking — Recuperação de senha", sent.getSubject());
        assertEquals("reader@example.com", sent.getAllRecipients()[0].toString());
        String body = extractText((Multipart) sent.getContent());
        assertTrue(body.contains("https://app.example.invalid/reset-password#token=opaque-token"));
        assertTrue(body.contains("30 minutos"));
        assertTrue(body.contains("ignore este e-mail"));
    }

    private static String extractText(Multipart multipart) throws Exception {
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < multipart.getCount(); i++) {
            Object content = multipart.getBodyPart(i).getContent();
            if (content instanceof String value) text.append(value);
            if (content instanceof Multipart nested) text.append(extractText(nested));
        }
        return text.toString();
    }
}
