package com.manganetworking.controller;

import com.manganetworking.service.storage.FileStorageService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/storage", "/api/uploads"})
public class FileStorageController {

    private final FileStorageService fileStorageService;

    public FileStorageController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    /**
     * Entrega de páginas de mangá e avatares armazenados no disco local
     */
    @GetMapping("/{filename:.+}")
    public ResponseEntity<byte[]> getFile(@PathVariable String filename) {
        if (!fileStorageService.exists(filename)) {
            return ResponseEntity.notFound().build();
        }

        byte[] content = fileStorageService.loadFile(filename);
        MediaType mediaType = resolveMediaType(filename);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.set("X-Content-Type-Options", "nosniff");
        headers.setCacheControl("public, max-age=86400, immutable");

        return new ResponseEntity<>(content, headers, HttpStatus.OK);
    }

    private MediaType resolveMediaType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }
}
