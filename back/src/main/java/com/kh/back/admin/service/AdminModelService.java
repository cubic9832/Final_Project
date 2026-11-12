package com.kh.back.admin.service;

import com.kh.back.admin.dto.AdminCandidate;
import com.kh.back.admin.dto.AdminModelComparison;
import com.kh.back.admin.dto.AdminModelReport;
import java.util.List;

// 7단계: 관리자 모델 관리 · 추천 관리 — 추천 서버가 쓰는 학습 결과 폴더(읽기만)와 모델 버전 기록
public interface AdminModelService {

    // 기본 폴더(추천 서버 기본 모델)의 학습 · 평가 결과
    AdminModelReport getReport();

    // 비교 표에서 고른 폴더 ("계열/폴더"). 없으면 404
    AdminModelReport getReport(String runId);

    // 학습 결과 폴더 전체 비교 + 추천 서버 상태 · 트래픽 비율 · 실제 사용량
    AdminModelComparison getComparison();

    // 실행 중인 추천 서버의 공개 후보 통합 목록. 조회 실패는 503
    List<AdminCandidate> getCandidates();
}
