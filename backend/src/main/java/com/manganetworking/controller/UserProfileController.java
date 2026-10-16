package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
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
        UUID effectiveId = SecurityContextUtils.resolveCurrentUserId(currentUserId);
        return ResponseEntity.ok(profileService.getReaderProfile(userId, effectiveId));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, String>> updateProfile(
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID currentUserId,
            @Valid @RequestBody UpdateProfileRequestDto dto
    ) {
        UUID effectiveId = SecurityContextUtils.resolveCurrentUserId(currentUserId);
        profileService.updateProfile(effectiveId, dto);
        return ResponseEntity.ok(Map.of("message", "Perfil atualizado com sucesso"));
    }

    @PostMapping("/library/{workId}/toggle")
    public ResponseEntity<ToggleLikeResponseDto> toggleLikeWork(
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID currentUserId,
            @PathVariable UUID workId
    ) {
        UUID effectiveId = SecurityContextUtils.resolveCurrentUserId(currentUserId);
        return ResponseEntity.ok(profileService.toggleLikeWork(effectiveId, workId));
    }

    @GetMapping("/reading-progress")
    public ResponseEntity<List<ReadingProgressDocument>> getReadingHistory(
            @RequestHeader(value = "X-Current-User-Id", required = false) String currentUserId
    ) {
        UUID parsed = currentUserId != null ? UUID.fromString(currentUserId) : null;
        UUID effectiveId = SecurityContextUtils.resolveCurrentUserId(parsed);
        return ResponseEntity.ok(profileService.getReadingHistory(effectiveId != null ? effectiveId.toString() : currentUserId));
    }

    @PostMapping("/reading-progress/track")
    public ResponseEntity<TrackPageResponseDto> trackPage(
            @RequestHeader(value = "X-Current-User-Id", required = false) String currentUserId,
            @Valid @RequestBody TrackPageRequestDto dto
    ) {
        UUID parsed = currentUserId != null ? UUID.fromString(currentUserId) : null;
        UUID effectiveId = SecurityContextUtils.resolveCurrentUserId(parsed);
        return ResponseEntity.ok(profileService.trackPage(effectiveId != null ? effectiveId.toString() : currentUserId, dto));
    }

    @GetMapping("/me/export")
    public ResponseEntity<UserDataExportDto> exportMyData(
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID currentUserId
    ) {
        UUID effectiveId = SecurityContextUtils.resolveCurrentUserId(currentUserId);
        return ResponseEntity.ok(profileService.exportUserData(effectiveId));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> deleteAccount(
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID currentUserId
    ) {
        UUID effectiveId = SecurityContextUtils.resolveCurrentUserId(currentUserId);
        profileService.deleteUserAccountLgpd(effectiveId);
        return ResponseEntity.ok(Map.of(
                "message", "Conta anonimizada e dados pessoais removidos com sucesso em conformidade com a LGPD."
        ));
    }
}
