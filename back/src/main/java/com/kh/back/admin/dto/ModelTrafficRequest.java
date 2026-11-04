package com.kh.back.admin.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 모델 관리: 트래픽 비율 전체 바꾸기 { "allocations": [{ "modelBundle": "...", "weightPercent": 70 }, ...] }.
 * 비율 합은 100 (서비스에서 확인). 목록에 없는 모델은 0%.
 */
public record ModelTrafficRequest(
        @NotNull(message = "비율 목록이 필요합니다.")
        @Size(min = 1, max = 20, message = "모델은 1~20개까지 정할 수 있습니다.")
        List<@Valid @NotNull Allocation> allocations) {

    public record Allocation(
            @NotNull(message = "모델 이름이 필요합니다.")
            @Pattern(regexp = "^[A-Za-z0-9._-]{1,100}$", message = "모델 이름 형식이 올바르지 않습니다.")
            String modelBundle,
            @NotNull(message = "비율이 필요합니다.")
            @Min(value = 0, message = "비율은 0~100% 입니다.")
            @Max(value = 100, message = "비율은 0~100% 입니다.")
            Integer weightPercent) {
    }
}
