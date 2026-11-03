package com.kh.back.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 9단계: 계정 정지 { "days": 7, "reason": "부적절한 이용" }. days = 0 이면 영구 (총관리자만 정지할 수 있다).
 * 사유는 운영 로그에 남긴다 (회원에게는 언제까지인지만 보인다).
 */
@Getter
@Setter
@NoArgsConstructor
public class MemberSuspendRequest {

    @NotNull(message = "정지 기간을 골라 주세요.")
    @Min(value = 0, message = "정지 기간은 1~30일 또는 영구입니다.")
    @Max(value = 30, message = "정지 기간은 1~30일 또는 영구입니다.")
    private Integer days;

    @NotBlank(message = "정지 사유를 골라 주세요.")
    @Size(max = 100, message = "사유는 100자까지 쓸 수 있습니다.")
    private String reason;
}
