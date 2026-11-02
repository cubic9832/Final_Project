package com.kh.back.chatbot.controller;

import com.kh.back.chatbot.dto.ChatFeedbackRequest;
import com.kh.back.chatbot.repository.ChatHistoryRepository;
import com.kh.back.common.exception.ApiException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chat-messages/{answerId}/feedback")
public class ChatFeedbackController {
    private final ChatHistoryRepository history;

    @PutMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rate(@AuthenticationPrincipal Long memberId, @PathVariable long answerId,
                     @Valid @RequestBody ChatFeedbackRequest request) {
        requireMember(memberId);
        history.feedback(memberId, answerId, request.rating().name());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal Long memberId, @PathVariable long answerId) {
        requireMember(memberId);
        history.feedback(memberId, answerId, null);
    }

    private void requireMember(Long memberId) {
        if (memberId == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", "로그인이 필요합니다.");
    }

    @ExceptionHandler(ApiException.class)
    ProblemDetail failure(ApiException error) {
        var detail = ProblemDetail.forStatusAndDetail(error.getStatus(), error.getMessage());
        detail.setProperty("code", error.getCode());
        return detail;
    }
}
