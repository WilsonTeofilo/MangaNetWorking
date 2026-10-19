package com.manganetworking.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class StorageFileNamesTest {

    @Test
    @DisplayName("Extrai o nome do arquivo da URL de entrega de páginas")
    void extractsFilenameFromStorageUrl() {
        assertEquals("abc.png", StorageFileNames.fromPageToken("/api/storage/abc.png"));
    }

    @Test
    @DisplayName("Aceita também o prefixo alternativo /api/uploads")
    void extractsFilenameFromUploadsUrl() {
        assertEquals("abc.png", StorageFileNames.fromPageToken("/api/uploads/abc.png"));
    }

    @Test
    @DisplayName("Aceita o nome puro do arquivo (sem barra)")
    void acceptsBareFilename() {
        assertEquals("abc.png", StorageFileNames.fromPageToken("abc.png"));
    }

    @Test
    @DisplayName("Descarta query string e fragmento")
    void stripsQueryStringAndFragment() {
        assertEquals("abc.png", StorageFileNames.fromPageToken("/api/storage/abc.png?v=2"));
        assertEquals("abc.png", StorageFileNames.fromPageToken("/api/storage/abc.png#page1"));
    }

    @Test
    @DisplayName("Descarta espaços ao redor")
    void trimsWhitespace() {
        assertEquals("abc.png", StorageFileNames.fromPageToken("  /api/storage/abc.png  "));
    }

    @Test
    @DisplayName("Retorna nulo para token nulo, vazio ou sem arquivo")
    void returnsNullForEmptyTokens() {
        assertNull(StorageFileNames.fromPageToken(null));
        assertNull(StorageFileNames.fromPageToken("   "));
        assertNull(StorageFileNames.fromPageToken("/api/storage/"));
        assertNull(StorageFileNames.fromPageToken(""));
    }
}
