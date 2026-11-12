package com.kh.back.member.recommendation;

import com.kh.back.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/members/me/recommendation-inputs")
@RequiredArgsConstructor
public class RecommendationInputsController {
    private final RecommendationInputsService service;

    @GetMapping
    public ApiResponse<RecommendationInputsRepository.Saved> get(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(service.get(userId));
    }

    @PatchMapping
    public ApiResponse<RecommendationInputsRepository.Saved> save(
            @AuthenticationPrincipal Long userId, @Valid @RequestBody RecommendationInputsRequest request) {
        return ApiResponse.ok(service.save(userId, request));
    }
}
