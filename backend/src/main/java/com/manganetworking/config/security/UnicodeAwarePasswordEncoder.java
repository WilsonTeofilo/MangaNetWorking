package com.manganetworking.config.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * BCrypt encoder that first SHA-256 hashes UTF-8 input, avoiding BCrypt's 72-byte truncation
 * while preserving compatibility with existing raw BCrypt hashes.
 */
public final class UnicodeAwarePasswordEncoder implements PasswordEncoder {

    private static final String PREFIX = "{bcrypt-sha256}";

    private final BCryptPasswordEncoder bcrypt;

    public UnicodeAwarePasswordEncoder(int strength) {
        this.bcrypt = new BCryptPasswordEncoder(strength);
    }

    @Override
    public String encode(CharSequence rawPassword) {
        return PREFIX + bcrypt.encode(sha256Base64(rawPassword));
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) return false;
        if (encodedPassword.startsWith(PREFIX)) {
            return bcrypt.matches(sha256Base64(rawPassword), encodedPassword.substring(PREFIX.length()));
        }
        return bcrypt.matches(rawPassword, encodedPassword);
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return encodedPassword == null || !encodedPassword.startsWith(PREFIX);
    }

    private String sha256Base64(CharSequence rawPassword) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawPassword.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
