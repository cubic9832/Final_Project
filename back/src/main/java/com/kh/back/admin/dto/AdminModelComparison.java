package com.kh.back.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 모델 관리 — 여러 학습 결과(ml/outputs/models/<계열>/<폴더>)를 나란히 비교하고, 추천 서버 · 트래픽 비율 · 실제 사용량을 함께 본다.
 *
 * @param models            학습 결과 폴더별 한 줄 (+ 추천 서버가 쓰지만 폴더를 찾지 못한 모델)
 * @param upstreams         설정한 추천 서버들의 지금 상태
 * @param trafficConfigured 비율을 저장했는지 (false 면 첫 번째로 켜진 추천 서버가 모든 요청을 받는다)
 * @param launcherEnabled   관리자 화면에서 추천 서버를 켜고 끌 수 있는지 (recommendation.launcher.enabled)
 * @param versions          재무 진단을 저장할 때 쓰인 모델 버전 기록 (DB, 모델 전체)
 */
public record AdminModelComparison(List<ModelRow> models, List<Upstream> upstreams, boolean trafficConfigured,
                                   boolean launcherEnabled, List<AdminModelReport.Version> versions) {

    /**
     * @param runId            상세 조회용 "계열/폴더" (폴더를 찾지 못한 모델은 null)
     * @param runName          폴더 이름 = 추천 서버의 modelBundle
     * @param family           계열 (scenario-choices · candidate-preferences)
     * @param schema           입력 구조
     * @param trainedAt        model.pt 를 만든 시각
     * @param profiles         학습 · 평가에 쓴 가상 가구 수
     * @param comparisons      평가 비교 수
     * @param metricKind       정확도의 뜻 (계열마다 달라 그대로 비교하면 안 된다)
     * @param testAccuracy     시험 정확도 (0~1)
     * @param testLogLoss      시험 log loss (낮을수록 좋음, 없으면 null)
     * @param baselineLabel    비교 기준 이름 (선형 기준선 · 이전 모델)
     * @param baselineAccuracy 비교 기준의 정확도
     * @param compatible       지금 화면(시나리오 입력)과 맞는 입력 구조인지
     * @param servable         이 모델을 쓰는 추천 서버가 켜져 있는지
     * @param weightPercent    저장한 트래픽 비율 (0~100)
     * @param requests7Days    최근 7일 성공한 추천 요청 수
     * @param diagnoses        이 모델로 저장된 재무 진단 수
     * @param serverState      추천 서버 상태: RUNNING · STARTING(켜는 중) · FAILED(켜기 실패) · OFF
     * @param serverPort       추천 서버 포트 (꺼져 있으면 null)
     * @param serverError      켜기 실패 사유 (추천 서버 로그의 마지막 오류 줄)
     * @param stoppable        관리자 화면에서 끌 수 있는지 (관리자 화면에서 켠 포트만. dev.sh 로 켠 고정 서버는 false)
     */
    public record ModelRow(String runId, String runName, String family, String schema, LocalDateTime trainedAt,
                           Long profiles, Long comparisons, String metricKind, Double testAccuracy, Double testLogLoss,
                           String baselineLabel, Double baselineAccuracy, boolean compatible, boolean servable,
                           int weightPercent, long requests7Days, int diagnoses, String serverState, Integer serverPort,
                           String serverError, boolean stoppable) {
    }

    public record Upstream(String baseUrl, boolean up, String modelBundle, String rankerSchema,
                           Integer catalogCount, Integer modelNames) {
    }
}
