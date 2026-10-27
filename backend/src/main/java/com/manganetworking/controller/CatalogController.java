package com.manganetworking.controller;

import com.manganetworking.service.catalog.CatalogQueryService;
import com.manganetworking.service.catalog.dto.CatalogPageResponseDto;
import com.manganetworking.service.catalog.dto.CatalogReleaseResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Catálogo e lançamentos públicos.
 *
 * <p>O formato ({@code MANGA} / {@code LIGHT_NOVEL}) é o primeiro eixo de filtro e é sempre
 * validado no servidor: valor desconhecido cai em "tudo" em vez de esconder obras. Nenhuma obra
 * suspensa ou arquivada por LGPD aparece por aqui.</p>
 */
@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogQueryService catalogQueryService;

    public CatalogController(CatalogQueryService catalogQueryService) {
        this.catalogQueryService = catalogQueryService;
    }

    /**
     * Lista paginada com filtros combináveis.
     *
     * @param formato      {@code manga}, {@code light-novel} ou ausente (tudo)
     * @param genero       gênero repetível ou separado por vírgula (OR dentro do eixo)
     * @param status       {@code ongoing}, {@code completed}, {@code hiatus}
     * @param publico      {@code shonen} ou {@code seinen}
     * @param q            busca por obra, autor ou gênero
     * @param ordem        {@code relevance}, {@code recent}, {@code updated}, {@code views}, {@code title}
     * @param ilustracoes  só light novels com apresentação ilustrada
     */
    @GetMapping
    public ResponseEntity<CatalogPageResponseDto> search(
            @RequestParam(required = false) String formato,
            @RequestParam(required = false) List<String> genero,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String publico,
            @RequestParam(required = false, name = "q") String q,
            @RequestParam(required = false, defaultValue = "relevance") String ordem,
            @RequestParam(required = false, defaultValue = "false") boolean ilustracoes,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "24") int size
    ) {
        return ResponseEntity.ok(catalogQueryService.search(
                formato, genero, status, publico, q, ordem, ilustracoes, page, size));
    }

    /** Lançamentos já públicos, mais recentes primeiro. Só o que já foi liberado ao público. */
    @GetMapping("/releases")
    public ResponseEntity<List<CatalogReleaseResponseDto>> releases(
            @RequestParam(required = false) String formato,
            @RequestParam(required = false, defaultValue = "40") int limit
    ) {
        return ResponseEntity.ok(catalogQueryService.releases(formato, limit));
    }
}
