package com.kh.back.diagnosis.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 마이페이지 "최근 재무 진단" 한 건 (금액은 원 단위). MyBatis 가 칸 이름(snake_case → camelCase)으로 채운다.
 */
@Getter
@Setter
@NoArgsConstructor
public class DiagnosisSummary {
    private Long analysisId;        // 분석 실행 번호 (analysis_runs)
    private LocalDateTime completedAt; // 진단을 마친 시각
    private Long monthlyIncome;     // 월 실수령액
    private Long monthlyAvailable;  // 차량 구매 전 월 여유금 (마이너스일 수 있음)
    private Long purchaseFunds;     // 사용 가능 예금
    private Long priceUpper;        // 구매 가격 상한 (없으면 null)

    // 11-04: 자세히 보기 (GET /{analysisId}) 에서만 채운다 — 목록에서는 null
    private Long monthlyExpense;    // 생활지출 합계 (대출 상환 제외)
    private Long otherIncome;       // 기타 월 정기소득 — null 이면 요약만 저장한 예전 기록
    @JsonIgnore
    private Long snapshotId;        // 대출 목록을 찾을 입력 버전 번호 (응답에는 안 보냄)
    private List<DiagnosisLoan> loans; // 기존 대출
}
