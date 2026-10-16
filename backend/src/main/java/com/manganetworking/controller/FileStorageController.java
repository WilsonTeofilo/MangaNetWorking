package com.manganetworking.controller;

import com.manganetworking.service.storage.ChapterFileAccessGuard;
import com.manganetworking.service.storage.FileStorageService;
import com.manganetworking.service.storage.dto.StoredFileResponseDto;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping({"/api/storage", "/api/uploads"})
public class FileStorageController {

    /** Limite defensivo de arquivos por lote (tamanho total também é limitado em application.yml). */
    private static final int MAX_BATCH_FILES = 300;

    /** Prefixo público de entrega de arquivos; mantém as URLs de conteúdo estáveis para o frontend e o app. */
    private static final String STORAGE_URL_PREFIX = "/api/storage/";

    private final FileStorageService fileStorageService;
    private final ChapterFileAccessGuard fileAccessGuard;

    public FileStorageController(FileStorageService fileStorageService, ChapterFileAccessGuard fileAccessGuard) {
        this.fileStorageService = fileStorageService;
        this.fileAccessGuard = fileAccessGuard;
    }

    /**
     * Upload de arquivo individual (Capa, Banner ou Avatar).
     * O limite de tamanho é aplicado pelo container multipart (application.yml) antes de materializar o byte[].
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<StoredFileResponseDto> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        StoredFileResponseDto stored = storeOne(file);
        return ResponseEntity.ok(stored);
    }

    /**
     * Upload em lote de arquivos (Páginas do Capítulo de Mangá).
     */
    @PostMapping(value = "/upload/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<StoredFileResponseDto>> uploadBatch(
            @RequestParam("files") List<MultipartFile> files
    ) throws IOException {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("Envie ao menos um arquivo para o upload em lote.");
        }
        if (files.size() > MAX_BATCH_FILES) {
            throw new IllegalArgumentException(
                    "O lote excede o limite de " + MAX_BATCH_FILES + " arquivos por requisição."
            );
        }

        List<StoredFileResponseDto> results = new ArrayList<>(files.size());
        for (MultipartFile file : files) {
            results.add(storeOne(file));
        }
        return ResponseEntity.ok(results);
    }

    /**
     * Entrega de páginas de mangá e avatares armazenados no disco local.
     */
    @GetMapping("/{filename:.+}")
    public ResponseEntity<byte[]> getFile(@PathVariable String filename) {
        if (!fileStorageService.exists(filename)) {
            return ResponseEntity.notFound().build();
        }

        // Capas/avatares são públicos; páginas de capítulo respeitam early access e suspensão.
        ChapterFileAccessGuard.AccessDecision decision = fileAccessGuard.evaluate(filename);
        if (!decision.allowed()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        byte[] content = fileStorageService.loadFile(filename);
        MediaType mediaType = resolveMediaType(filename);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.set("X-Content-Type-Options", "nosniff");
        // Página de capítulo (early access/suspensa) liberada a um membro não pode ser cacheada por
        // CDN/proxy compartilhado — senão o cache reentrega a um não-membro a resposta do guard.
        headers.setCacheControl(decision.privateContent()
                ? "private, no-store"
                : "public, max-age=86400, immutable");

        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    private StoredFileResponseDto storeOne(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio ou ausente no upload.");
        }
        String filename = fileStorageService.storeFile(file.getBytes(), file.getOriginalFilename(), file.getContentType());
        return new StoredFileResponseDto(filename, STORAGE_URL_PREFIX + filename);
    }

    private MediaType resolveMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }
}
