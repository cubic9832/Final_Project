package com.kh.back.chatbot.controller;

import com.kh.back.chatbot.repository.ChatHistoryRepository;
import com.kh.back.common.dto.ApiResponse;
import com.kh.back.common.exception.ApiException;
import com.kh.back.common.security.CurrentRoleLookup;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class AdminChatbotController {
    private final ChatHistoryRepository history;
    private final CurrentRoleLookup roles;

    @GetMapping("/chatbot-exchanges")
    public ApiResponse<ChatHistoryRepository.ExchangePage> exchanges(@AuthenticationPrincipal Long actor,
            @RequestParam(defaultValue="ALL") String rating, @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="") String keyword, @RequestParam(defaultValue="") String sort,
            @RequestParam(defaultValue="ASC") String direction) {
        requireAdmin(actor);
        if (!Set.of("ALL", "LIKE", "DISLIKE", "UNRATED").contains(rating) || page < 0 || page > 100000 || keyword.strip().length() > 50
                || !Set.of("", "number", "question", "member", "source", "answer", "rating", "createdAt").contains(sort)
                || !Set.of("ASC", "DESC").contains(direction))
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "조회 조건을 확인해 주세요.");
        return ApiResponse.ok(history.exchanges(rating, page, keyword.strip(), sort, direction));
    }

    @GetMapping("/chatbot-conversations/{conversationId}/messages")
    public ApiResponse<ChatHistoryRepository.MessagePage> messages(@AuthenticationPrincipal Long actor,
            @PathVariable long conversationId, @RequestParam(required=false) Long beforeId) {
        requireAdmin(actor);
        if (beforeId != null && beforeId <= 0)
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "올바른 대화 번호를 입력해 주세요.");
        if (!history.conversationExists(conversationId))
            throw new ApiException(HttpStatus.NOT_FOUND, "CHAT_NOT_FOUND", "대화를 찾을 수 없습니다.");
        return ApiResponse.ok(history.conversationMessages(conversationId, beforeId, 20));
    }

    private void requireAdmin(Long actor) {
        String role = actor == null ? null : roles.currentRole(actor);
        if (role == null || !Set.of("ADMIN", "SUPER_ADMIN").contains(role))
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 주소가 없습니다.");
    }

    @ExceptionHandler(ApiException.class)
    ProblemDetail failure(ApiException error) {
        var detail = ProblemDetail.forStatusAndDetail(error.getStatus(), error.getMessage());
        detail.setProperty("code", error.getCode());
        return detail;
    }
}
