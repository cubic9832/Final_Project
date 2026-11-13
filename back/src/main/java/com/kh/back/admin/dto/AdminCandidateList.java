package com.kh.back.admin.dto;

import java.util.List;

/**
 * 관리자 추천 관리: 켜진 추천 서버들의 후보 통합 목록.
 * 서버끼리 카탈로그가 달라도 목록은 기준 서버(첫 번째) 값으로 보여 주고, 다른 점은 경고로 알린다.
 *
 * @param candidates 후보 차량 (같은 id 는 기준 서버 값)
 * @param warnings   화면에 그대로 보여 줄 경고 문장 (카탈로그가 다른 서버 · 조회에 실패한 서버). 없으면 빈 목록
 */
public record AdminCandidateList(List<AdminCandidate> candidates, List<String> warnings) {
}
