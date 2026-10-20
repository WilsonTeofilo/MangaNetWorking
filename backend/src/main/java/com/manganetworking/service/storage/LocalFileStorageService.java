package com.manganetworking.service.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalFileStorageService.class);

    private static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final Path uploadDir;
    private final long maxFileSizeBytes;
    private final long maxFileSizeMb;

    public LocalFileStorageService(
            @Value("${platform.storage.local-upload-dir:./data/uploads}") String uploadPath,
            @Value("${platform.storage.max-file-size-mb:15}") long maxFileSizeMb
    ) {
        if (maxFileSizeMb <= 0) {
            throw new IllegalArgumentException("O limite de tamanho do arquivo deve ser positivo.");
        }
        try {
            this.maxFileSizeBytes = Math.multiplyExact(maxFileSizeMb, 1024L * 1024L);
        } catch (ArithmeticException overflow) {
            throw new IllegalArgumentException("O limite de tamanho do arquivo excede a capacidade suportada.", overflow);
        }

        this.uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        this.maxFileSizeMb = maxFileSizeMb;
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new StorageException("Não foi possível criar o diretório de uploads local: " + this.uploadDir, e);
        }
    }

    @Override
    public String storeFile(byte[] fileBytes, String originalFilename, String contentType) {
        if (fileBytes == null || fileBytes.length == 0) {
            throw new IllegalArgumentException("Arquivo vazio não é permitido.");
        }

        if (fileBytes.length > maxFileSizeBytes) {
            throw new IllegalArgumentException(
                    "Tamanho do arquivo excede o limite máximo permitido de " + maxFileSizeMb + "MB.");
        }

        // Validação estrita de tipo MIME (SVG e executáveis são bloqueados)
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new FilePolicyException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Formato de arquivo não suportado. Apenas JPEG, PNG e WebP são aceitos.");
        }

        // Validação de Magic Bytes para impedir spoofing de extensão
        validateMagicBytes(fileBytes, contentType);

        String extension = resolveExtension(contentType);
        String safeFilename = UUID.randomUUID() + "." + extension;

        Path targetPath = this.uploadDir.resolve(safeFilename).normalize();
        if (!targetPath.startsWith(this.uploadDir)) {
            throw new FilePolicyException(HttpStatus.BAD_REQUEST,
                    "Tentativa de Path Traversal bloqueada: " + originalFilename);
        }

        try {
            Files.write(targetPath, fileBytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("[STORAGE] Arquivo armazenado com sucesso no filesystem local: {}", safeFilename);
            return safeFilename;
        } catch (IOException e) {
            throw new StorageException("Erro de I/O ao salvar arquivo no disco local", e);
        }
    }

    @Override
    public byte[] loadFile(String filename) {
        if (filename == null || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new FilePolicyException(HttpStatus.BAD_REQUEST, "Nome de arquivo inválido para leitura");
        }

        Path filePath = this.uploadDir.resolve(filename).normalize();
        if (!Files.exists(filePath) || !filePath.startsWith(this.uploadDir)) {
            throw new IllegalArgumentException("Arquivo não encontrado: " + filename);
        }

        try {
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new StorageException("Erro ao ler arquivo do disco local", e);
        }
    }

    @Override
    public void deleteFile(String filename) {
        if (!isSafeStorageFilename(filename)) return;
        Path filePath = this.uploadDir.resolve(filename).normalize();
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Remoção é melhor esforço (ex.: arquivo bloqueado no Windows); registra sem falhar a operação.
            log.warn("[STORAGE] Não foi possível remover o arquivo {}: {}", filename, e.getMessage());
        }
    }

    @Override
    public boolean exists(String filename) {
        if (!isSafeStorageFilename(filename)) return false;
        Path filePath = this.uploadDir.resolve(filename).normalize();
        return Files.exists(filePath);
    }

    /**
     * Guarda comum a {@link #exists(String)} e {@link #deleteFile(String)}: o nome
     * não pode ser nulo, conter traversal nem separadores, e a resolução precisa
     * permanecer dentro de {@code uploadDir} (caminho absoluto também é rejeitado).
     */
    private boolean isSafeStorageFilename(String filename) {
        if (filename == null || filename.contains("..")
                || filename.contains("/") || filename.contains("\\")) {
            return false;
        }
        try {
            return this.uploadDir.resolve(filename).normalize().startsWith(this.uploadDir);
        } catch (RuntimeException invalidPath) {
            return false;
        }
    }

    private void validateMagicBytes(byte[] bytes, String contentType) {
        if (bytes.length < 4) {
            throw new FilePolicyException(HttpStatus.BAD_REQUEST, "Arquivo corrompido");
        }

        // JPEG: FF D8 FF
        if (contentType.equalsIgnoreCase("image/jpeg")) {
            if ((bytes[0] & 0xFF) != 0xFF || (bytes[1] & 0xFF) != 0xD8 || (bytes[2] & 0xFF) != 0xFF) {
                throw new FilePolicyException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "Assinatura do arquivo não corresponde a uma imagem JPEG válida.");
            }
        }
        // PNG: 89 50 4E 47
        else if (contentType.equalsIgnoreCase("image/png")) {
            if ((bytes[0] & 0xFF) != 0x89 || (bytes[1] & 0xFF) != 0x50 ||
                (bytes[2] & 0xFF) != 0x4E || (bytes[3] & 0xFF) != 0x47) {
                throw new FilePolicyException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "Assinatura do arquivo não corresponde a uma imagem PNG válida.");
            }
        }
        // WebP: RIFF (bytes 0..3) + WEBP (bytes 8..11)
        else if (contentType.equalsIgnoreCase("image/webp")) {
            if (bytes.length < 12) {
                throw new FilePolicyException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "Arquivo WebP incompleto ou corrompido.");
            }
            boolean isRiff = (bytes[0] & 0xFF) == 'R' && (bytes[1] & 0xFF) == 'I'
                    && (bytes[2] & 0xFF) == 'F' && (bytes[3] & 0xFF) == 'F';
            boolean isWebp = (bytes[8] & 0xFF) == 'W' && (bytes[9] & 0xFF) == 'E'
                    && (bytes[10] & 0xFF) == 'B' && (bytes[11] & 0xFF) == 'P';

            if (!isRiff || !isWebp) {
                throw new FilePolicyException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                        "Assinatura do arquivo não corresponde a uma imagem WebP válida (RIFF/WEBP).");
            }
        }
    }


    private String resolveExtension(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }
}
