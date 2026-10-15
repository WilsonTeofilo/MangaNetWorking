package com.manganetworking.service.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class FileStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalFileStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new LocalFileStorageService(tempDir.toString());
    }

    @Test
    void shouldStoreAndRetrieveValidPngImage() {
        // Magic bytes válidos de PNG: 89 50 4E 47
        byte[] validPngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01};

        String filename = storageService.storeFile(validPngBytes, "capa.png", "image/png");
        assertNotNull(filename);
        assertTrue(filename.endsWith(".png"));

        byte[] loadedBytes = storageService.loadFile(filename);
        assertNotNull(loadedBytes);
        assertArrayEquals(validPngBytes, loadedBytes);
        assertTrue(storageService.exists(filename));
    }

    @Test
    void shouldRejectFileWithInvalidMagicBytes() {
        // Arquivo fingindo ser PNG mas contendo texto simples
        byte[] fakeBytes = "console.log('malware')".getBytes();

        SecurityException exception = assertThrows(SecurityException.class, () ->
                storageService.storeFile(fakeBytes, "exploit.png", "image/png")
        );
        assertTrue(exception.getMessage().contains("Assinatura do arquivo"));
    }

    @Test
    void shouldRejectPathTraversalAttemptsOnLoad() {
        // Tentativa de carregar arquivo usando diretório relativo ou traversal
        assertThrows(SecurityException.class, () ->
                storageService.loadFile("../../../windows/system32/cmd.exe")
        );
    }

    @Test
    void shouldDeleteFileCorrectly() {
        byte[] validJpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};
        String filename = storageService.storeFile(validJpegBytes, "foto.jpg", "image/jpeg");
        assertTrue(storageService.exists(filename));

        storageService.deleteFile(filename);
        assertFalse(storageService.exists(filename));
    }
}
