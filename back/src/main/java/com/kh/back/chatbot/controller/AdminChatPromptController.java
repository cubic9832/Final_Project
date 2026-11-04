package com.kh.back.chatbot.controller;

import com.kh.back.chatbot.repository.ChatPromptRepository;
import com.kh.back.common.dto.ApiResponse;
import com.kh.back.common.exception.ApiException;
import com.kh.back.common.security.CurrentRoleLookup;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class AdminChatPromptController {
    private final ChatPromptRepository prompts;
    private final CurrentRoleLookup roles;

    public record CreatePrompt(@NotBlank @Pattern(regexp="[A-Za-z0-9._-]{1,40}", message="버전명은 영문·숫자·마침표·밑줄·하이픈으로 40자 이내 입력해 주세요.") String version,
                               @NotBlank(message="답변 지침을 입력해 주세요.") @Size(max=16000, message="답변 지침은 16000자 이내로 입력해 주세요.") String content,
                               @NotBlank(message="변경 설명을 입력해 주세요.") @Size(max=500, message="변경 설명은 500자 이내로 입력해 주세요.") String description) {}
    public record ActivePrompt(@NotNull @Positive Long promptVersionId) {}

    @GetMapping("/chatbot-prompt-versions")
    public ApiResponse<List<ChatPromptRepository.Statistics>> list(@AuthenticationPrincipal Long actor) {
        requireAdmin(actor);
        return ApiResponse.ok(prompts.statistics());
    }

    @PostMapping("/chatbot-prompt-versions")
    public ResponseEntity<ApiResponse<ChatPromptRepository.Version>> create(@AuthenticationPrincipal Long actor,
            @Valid @RequestBody CreatePrompt request) {
        requireAdmin(actor);
        var created = prompts.create(request.version(), request.content().strip(), request.description().strip(), actor);
        return ResponseEntity.created(URI.create("/api/v1/admin/chatbot-prompt-versions/" + created.id())).body(ApiResponse.ok(created));
    }

    @PutMapping("/chatbot-active-prompt")
    public ApiResponse<ChatPromptRepository.Version> activate(@AuthenticationPrincipal Long actor,
            @Valid @RequestBody ActivePrompt request) {
        requireAdmin(actor);
        return ApiResponse.ok(prompts.activate(request.promptVersionId()));
    }

    private void requireAdmin(Long actor) {
        String role = actor == null ? null : roles.currentRole(actor);
        if (!Set.of("ADMIN", "SUPER_ADMIN").contains(role == null ? "" : role))
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 주소가 없습니다.");
    }

    @ExceptionHandler(ApiException.class)
    ProblemDetail failure(ApiException error) {
        var detail = ProblemDetail.forStatusAndDetail(error.getStatus(), error.getMessage());
        detail.setProperty("code", error.getCode());
        return detail;
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    ProblemDetail invalid(org.springframework.web.bind.MethodArgumentNotValidException error) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, error.getBindingResult().getAllErrors().get(0).getDefaultMessage());
    }
}
