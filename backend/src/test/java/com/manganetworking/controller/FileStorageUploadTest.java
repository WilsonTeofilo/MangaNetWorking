package com.manganetworking.controller;

import com.jayway.jsonpath.JsonPath;
import com.manganetworking.config.security.SecurityConfig;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.storage.ChapterFileAccessGuard;
import com.manganetworking.service.storage.FileStorageService;
import com.manganetworking.service.storage.LocalFileStorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fluxo real de upload: multipart atravessa o controller, passa pelo FileStorageService de verdade
 * (escrita em disco em diretório temporário) e o arquivo é entregue de volta.
 * Cobre também a autorização do endpoint (apenas criador) e o bloqueio de páginas pelo guard.
 */
@WebMvcTest(controllers = FileStorageController.class)
@Import({SecurityConfig.class, FileStorageUploadTest.StorageTestConfig.class})
@DisplayName("Upload real de arquivos (multipart → disco) e entrega")
class FileStorageUploadTest {

    /** Diretório temporário isolado, criado antes da subida do contexto Spring. */
    private static final Path UPLOAD_DIR = createTempUploadDir();

    /** Assinatura JPEG mínima válida para a checagem de magic bytes. */
    private static final byte[] JPEG_BYTES = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00
    };

    private static Path createTempUploadDir() {
        try {
            return Files.createTempDirectory("mn-uploads-test");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @TestConfiguration
    static class StorageTestConfig {
        @Bean
        FileStorageService fileStorageService() {
            return new LocalFileStorageService(UPLOAD_DIR.toString(), 15);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SessionService sessionService;

    @MockitoBean
    private ChapterFileAccessGuard chapterFileAccessGuard;

    @Test
    @WithMockUser(roles = "CREATOR")
    @DisplayName("Criador envia uma imagem e o arquivo é persistido e entregue de volta")
    void creatorUploadsFileAndItIsPersistedAndServed() throws Exception {
        when(chapterFileAccessGuard.evaluate(anyString()))
                .thenReturn(new ChapterFileAccessGuard.AccessDecision(true, false));

        MvcResult result = mockMvc.perform(multipart("/api/storage/upload")
                        .file(new MockMultipartFile("file", "capa.jpg", "image/jpeg", JPEG_BYTES)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filename").isNotEmpty())
                .andExpect(jsonPath("$.url").value(startsWith("/api/storage/")))
                .andReturn();

        String filename = JsonPath.read(result.getResponse().getContentAsString(), "$.filename");
        assertThat(Files.exists(UPLOAD_DIR.resolve(filename))).isTrue();
        assertThat(Files.readAllBytes(UPLOAD_DIR.resolve(filename))).isEqualTo(JPEG_BYTES);

        mockMvc.perform(get("/api/storage/{filename}", filename))
                .andExpect(status().isOk())
                .andExpect(content().bytes(JPEG_BYTES));
    }

    @Test
    @WithMockUser(roles = "CREATOR")
    @DisplayName("Criador envia lote de páginas → 200 com um item por arquivo")
    void creatorUploadsBatchOfPages() throws Exception {
        mockMvc.perform(multipart("/api/storage/upload/batch")
                        .file(new MockMultipartFile("files", "pagina-01.jpg", "image/jpeg", JPEG_BYTES))
                        .file(new MockMultipartFile("files", "pagina-02.jpg", "image/jpeg", JPEG_BYTES)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].filename").isNotEmpty())
                .andExpect(jsonPath("$[1].filename").isNotEmpty());
    }

    @Test
    @WithMockUser(roles = "READER")
    @DisplayName("Leitor não pode fazer upload → 403")
    void readerCannotUpload() throws Exception {
        mockMvc.perform(multipart("/api/storage/upload")
                        .file(new MockMultipartFile("file", "capa.jpg", "image/jpeg", JPEG_BYTES)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Anônimo não pode fazer upload → 401")
    void anonymousCannotUpload() throws Exception {
        mockMvc.perform(multipart("/api/storage/upload")
                        .file(new MockMultipartFile("file", "capa.jpg", "image/jpeg", JPEG_BYTES)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CREATOR")
    @DisplayName("Arquivo de página bloqueado pelo guard → 403 na entrega")
    void lockedChapterFileIsNotServed() throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/storage/upload")
                        .file(new MockMultipartFile("file", "pagina-privada.jpg", "image/jpeg", JPEG_BYTES)))
                .andExpect(status().isOk())
                .andReturn();

        String filename = JsonPath.read(result.getResponse().getContentAsString(), "$.filename");

        // Guard nega a leitura (early access sem assinatura / obra suspensa).
        when(chapterFileAccessGuard.evaluate(filename))
                .thenReturn(new ChapterFileAccessGuard.AccessDecision(false, true));

        mockMvc.perform(get("/api/storage/{filename}", filename))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "CREATOR")
    @DisplayName("Página de capítulo liberada é entregue como privada (sem cache público)")
    void chapterPageIsNotPubliclyCacheable() throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/storage/upload")
                        .file(new MockMultipartFile("file", "pagina-membro.jpg", "image/jpeg", JPEG_BYTES)))
                .andExpect(status().isOk())
                .andReturn();

        String filename = JsonPath.read(result.getResponse().getContentAsString(), "$.filename");

        when(chapterFileAccessGuard.evaluate(filename))
                .thenReturn(new ChapterFileAccessGuard.AccessDecision(true, true));

        mockMvc.perform(get("/api/storage/{filename}", filename))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "private, no-store"));
    }

    @Test
    @WithMockUser(roles = "CREATOR")
    @DisplayName("Formato não suportado no upload → 415 (não 401)")
    void unsupportedFormatReturns415() throws Exception {
        mockMvc.perform(multipart("/api/storage/upload")
                        .file(new MockMultipartFile("file", "malicioso.svg", "image/svg+xml", "<svg/>".getBytes())))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }

    @Test
    @WithMockUser(roles = "CREATOR")
    @DisplayName("Arquivo inexistente → 404")
    void missingFileReturns404() throws Exception {
        mockMvc.perform(get("/api/storage/{filename}", "nao-existe-abc123.jpg"))
                .andExpect(status().isNotFound());
    }
}
