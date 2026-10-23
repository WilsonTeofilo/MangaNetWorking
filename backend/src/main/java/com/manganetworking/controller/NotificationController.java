package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.notification.NotificationService;
import com.manganetworking.service.notification.dto.NotificationPageResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<NotificationPageResponseDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(notificationService.list(userId, page, size));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(Map.of("count", notificationService.unreadCount(userId)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, Boolean>> markRead(@PathVariable UUID id) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(Map.of("read", notificationService.markRead(userId, id)));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Integer>> markAllRead() {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(Map.of("updated", notificationService.markAllRead(userId)));
    }

    /** Limpa apenas as lidas; o front pede confirmação antes de chamar. */
    @DeleteMapping("/read")
    public ResponseEntity<Map<String, Long>> clearRead() {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(Map.of("removed", notificationService.clearRead(userId)));
    }
}
