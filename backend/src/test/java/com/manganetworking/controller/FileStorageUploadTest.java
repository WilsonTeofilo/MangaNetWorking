package com.manganetworking.controller;

import com.jayway.jsonpath.JsonPath;
import com.manganetworking.config.security.SecurityConfig;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.storage.ChapterFileAccessGuard;
import com.manganetworking.service.storage.AvatarImageProcessor;
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
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;

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

    /** Imagem JPEG decodificável, também usada pelos testes de dimensões das páginas. */
    private static final byte[] JPEG_BYTES = createJpeg(1, 1);

    private static byte[] createJpeg(int width, int height) {
        try {
            BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "jpg", output);
            return output.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

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

        @Bean
        AvatarImageProcessor avatarImageProcessor() {
            return new AvatarImageProcessor();
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
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(JPEG_BYTES));
    }

    @Test
    @WithMockUser(roles = "READER")
    @DisplayName("Avatar de leitor é recortado, redimensionado e recodificado como JPEG pelo servidor")
    void readerAvatarIsNormalizedServerSide() throws Exception {
        BufferedImage source = new BufferedImage(800, 400, BufferedImage.TYPE_INT_ARGB);
        var graphics = source.createGraphics();
        graphics.setColor(Color.RED);
        graphics.fillRect(0, 0, 800, 400);
        graphics.dispose();
        ByteArrayOutputStream input = new ByteArrayOutputStream();
        ImageIO.write(source, "png", input);

        MvcResult result = mockMvc.perform(multipart("/api/storage/avatar")
                        .file(new MockMultipartFile("file", "perfil.png", "image/png", input.toByteArray())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filename", org.hamcrest.Matchers.endsWith(".jpg")))
                .andReturn();

        String filename = JsonPath.read(result.getResponse().getContentAsString(), "$.filename");
        BufferedImage stored = ImageIO.read(UPLOAD_DIR.resolve(filename).toFile());
        assertThat(stored.getWidth()).isEqualTo(512);
        assertThat(stored.getHeight()).isEqualTo(512);
        assertThat(Files.readAllBytes(UPLOAD_DIR.resolve(filename))[0] & 0xFF).isEqualTo(0xFF);
    }

    @Test
    @WithMockUser(roles = "READER")
    @DisplayName("Avatar que não pode ser decodificado é rejeitado")
    void invalidAvatarIsRejected() throws Exception {
        byte[] invalidImage = new byte[]{
                (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00
        };
        mockMvc.perform(multipart("/api/storage/avatar")
                        .file(new MockMultipartFile("file", "perfil.jpg", "image/jpeg", invalidImage)))
                .andExpect(status().isBadRequest());
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
    @WithMockUser(roles = "CREATOR")
    @DisplayName("Página com dimensão acima do limite é rejeitada antes de salvar o lote")
    void oversizedPageDimensionsAreRejected() throws Exception {
        byte[] oversized = createJpeg(8193, 1);
        mockMvc.perform(multipart("/api/storage/upload/batch")
                        .file(new MockMultipartFile("files", "pagina-grande.jpg", "image/jpeg", oversized)))
                .andExpect(status().isBadRequest());
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
