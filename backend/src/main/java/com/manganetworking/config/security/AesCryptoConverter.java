package com.manganetworking.config.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Conversor JPA para criptografia autoritativa AES-256-GCM.
 * Protege dados sensíveis (como CPF e Chaves PIX de criadores) em repouso no banco de dados.
 */
@Converter
public class AesCryptoConverter implements AttributeConverter<String, String> {

    private static final Logger log = LoggerFactory.getLogger(AesCryptoConverter.class);
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128;
    private static final int IV_LENGTH_BYTE = 12;

    /**
     * Chave de desenvolvimento usada apenas quando {@code AES_SECRET_KEY} não está definida.
     * É criptograficamente segura (256 bits) mas deve ser substituída em produção.
     * Gerada offline: Base64.encode("MangaNetWorkingLocalDev2026SecureKey!") -> 32 bytes.
     */
    private static final String DEV_DEFAULT_KEY = "MangaNetWorkingLocalDev2026SecureKey!";

    private static volatile byte[] keyBytes = null;

    private static byte[] getKeyBytes() {
        if (keyBytes != null) return keyBytes;
        
        // 1. Variável de ambiente (produção)
        String envKey = System.getenv("AES_SECRET_KEY");
        
        // 2. Property do sistema (para testes)
        if (envKey == null || envKey.isBlank()) {
            envKey = System.getProperty("platform.security.aes-secret-key");
        }
        
        // 3. Chave de desenvolvimento local (NUNCA usar em produção)
        if (envKey == null || envKey.isBlank()) {
            log.warn("[AES-CRYPTO] AES_SECRET_KEY não configurada; usando chave de desenvolvimento local. "
                    + "Em produção, defina AES_SECRET_KEY com pelo menos 32 caracteres ASCII. "
                    + "Trocar a chave inviabiliza a leitura de dados já cifrados.");
            envKey = DEV_DEFAULT_KEY;
        }
        
        byte[] raw = envKey.getBytes(StandardCharsets.UTF_8);
        byte[] key32 = new byte[32];
        System.arraycopy(raw, 0, key32, 0, Math.min(raw.length, 32));
        keyBytes = key32;
        return keyBytes;
    }

    public static void setCustomKey(String customKey) {
        if (customKey != null) {
            byte[] raw = customKey.getBytes(StandardCharsets.UTF_8);
            byte[] key32 = new byte[32];
            System.arraycopy(raw, 0, key32, 0, Math.min(raw.length, 32));
            keyBytes = key32;
        }
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) {
            return attribute;
        }

        try {
            byte[] iv = new byte[IV_LENGTH_BYTE];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            SecretKeySpec keySpec = new SecretKeySpec(getKeyBytes(), "AES");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, parameterSpec);

            byte[] cipherText = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            // Concatena IV + CipherText para armazenamento autossuficiente
            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherText);

            return Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            log.error("[AES-CRYPTO] Erro ao criptografar atributo sensível: {}", e.getMessage());
            throw new IllegalStateException("Falha de criptografia de segurança", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return dbData;
        }

        try {
            byte[] decoded = Base64.getDecoder().decode(dbData);
            if (decoded.length < IV_LENGTH_BYTE) {
                // Caso não seja um dado cifrado com IV (e.g. dado legado não criptografado)
                return dbData;
            }

            ByteBuffer byteBuffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[IV_LENGTH_BYTE];
            byteBuffer.get(iv);

            byte[] cipherText = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
            SecretKeySpec keySpec = new SecretKeySpec(getKeyBytes(), "AES");
            cipher.init(Cipher.DECRYPT_MODE, keySpec, parameterSpec);

            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // Em caso de dado plano anterior à migração, fallback gracioso
            return dbData;
        }
    }
}
