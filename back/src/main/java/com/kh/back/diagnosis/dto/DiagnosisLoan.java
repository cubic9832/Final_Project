package com.kh.back.diagnosis.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 진단 때 입력한 기존 대출 한 건 (금액은 원 단위). 저장 요청 · 자세히 보기 응답에 같이 쓴다.
 * V1 의 loan_inputs 표에 들어간다 (새 DB 변경 없음)
 */
@Getter
@Setter
@NoArgsConstructor
public class DiagnosisLoan {

    @Size(max = 30, message = "대출 종류가 너무 깁니다.")
    private String type;            // 대출 종류 (예: 신용대출), 입력하지 않았으면 null

    @PositiveOrZero
    private Long balance;           // 잔액 (선택 입력)

    @NotNull(message = "대출 월 상환액이 필요합니다.")
    @PositiveOrZero
    private Long payment;           // 월 상환액
}
