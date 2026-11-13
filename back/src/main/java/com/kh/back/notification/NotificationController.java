package com.kh.back.notification;

import java.util.List;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.kh.back.common.dto.ApiResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final SavingsNotificationService service;
    private final NotificationStream stream;

    @GetMapping public ApiResponse<List<SavingsNotificationResponse>> list(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(service.list(userId));
    }
    @GetMapping(value="/stream", produces=MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> subscribe(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok().header("Cache-Control","no-cache").header("X-Accel-Buffering","no").body(stream.subscribe(userId));
    }
    @PostMapping("/savings-events") public ResponseEntity<Void> record(@AuthenticationPrincipal Long userId, @Valid @RequestBody SavingsNotificationRequest request) {
        service.record(userId, request);
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{id}") public ResponseEntity<Void> markRead(@AuthenticationPrincipal Long userId, @PathVariable long id) {
        service.markRead(userId,id);
        return ResponseEntity.noContent().build();
    }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal Long userId,@PathVariable long id) {
        service.delete(userId,id); return ResponseEntity.noContent().build();
    }
    @GetMapping("/preferences") public ApiResponse<java.util.Map<String,Boolean>> preferences(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(service.preferences(userId));
    }
    @PutMapping("/preferences/{type}") public ResponseEntity<Void> preference(@AuthenticationPrincipal Long userId,
            @PathVariable SavingsNotificationRequest.Type type,@Valid @RequestBody NotificationPreferenceRequest request) {
        service.preference(userId,type,request.enabled()); return ResponseEntity.noContent().build();
    }
}

