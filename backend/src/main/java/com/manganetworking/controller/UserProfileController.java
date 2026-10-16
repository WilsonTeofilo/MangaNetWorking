package com.manganetworking.controller;

import com.manganetworking.domain.nosql.ReadingProgressDocument;
import com.manganetworking.service.user.UserProfileApplicationService;
import com.manganetworking.service.user.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileApplicationService profileService;

    public UserProfileController(UserProfileApplicationService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<ReaderProfileResponseDto> getReaderProfile(
            @PathVariable UUID userId,
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID currentUserId
    ) {
        return ResponseEntity.ok(profileService.getReaderProfile(userId, currentUserId));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, String>> updateProfile(
            @RequestHeader("X-Current-User-Id") UUID currentUserId,
            @Valid @RequestBody UpdateProfileRequestDto dto
    ) {
        profileService.updateProfile(currentUserId, dto);
        return ResponseEntity.ok(Map.of("message", "Perfil atualizado com sucesso"));
    }

    @PostMapping("/library/{workId}/toggle")
    public ResponseEntity<ToggleLikeResponseDto> toggleLikeWork(
            @RequestHeader("X-Current-User-Id") UUID currentUserId,
            @PathVariable UUID workId
    ) {
        return ResponseEntity.ok(profileService.toggleLikeWork(currentUserId, workId));
    }

    @GetMapping("/reading-progress")
    public ResponseEntity<List<ReadingProgressDocument>> getReadingHistory(
            @RequestHeader("X-Current-User-Id") String currentUserId
    ) {
        return ResponseEntity.ok(profileService.getReadingHistory(currentUserId));
    }

    @PostMapping("/reading-progress/track")
    public ResponseEntity<TrackPageResponseDto> trackPage(
            @RequestHeader("X-Current-User-Id") String currentUserId,
            @Valid @RequestBody TrackPageRequestDto dto
    ) {
        return ResponseEntity.ok(profileService.trackPage(currentUserId, dto));
    }

    @GetMapping("/me/export")
    public ResponseEntity<UserDataExportDto> exportMyData(
            @RequestHeader("X-Current-User-Id") UUID currentUserId
    ) {
        return ResponseEntity.ok(profileService.exportUserData(currentUserId));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @RequestHeader("X-Current-User-Id") UUID currentUserId
    ) {
        profileService.deleteUserAccountLgpd(currentUserId);
        return ResponseEntity.ok(Map.of(
                "message", "Conta anonimizada e dados pessoais removidos com sucesso em conformidade com a LGPD."
        ));
    }
}
