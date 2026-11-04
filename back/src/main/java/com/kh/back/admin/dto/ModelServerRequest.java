package com.kh.back.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// 모델 관리: 추천 서버 켜기 { "runId": "scenario-choices/20261030-ui-v1-10k" } (비교 표의 runId)
public record ModelServerRequest(
        @NotBlank(message = "켤 모델을 골라 주세요.")
        @Pattern(regexp = "^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$", message = "모델 형식이 올바르지 않습니다.")
        String runId) {
}
