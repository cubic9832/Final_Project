package com.kh.back.admin.controller;

import com.kh.back.admin.dto.AdminCandidateList;
import com.kh.back.admin.dto.AdminModelComparison;
import com.kh.back.admin.dto.AdminModelReport;
import com.kh.back.admin.dto.ModelServerRequest;
import com.kh.back.admin.dto.ModelServerResponse;
import com.kh.back.admin.dto.ModelTrafficRequest;
import com.kh.back.admin.service.AdminModelServerService;
import com.kh.back.admin.service.AdminModelService;
import com.kh.back.admin.service.AdminModelTrafficService;
import com.kh.back.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 7단계: 관리자 모델 관리 · 추천 관리 — 학습 · 평가 결과, 추천 후보 차량, 모델 버전 기록.
 * 관리자 · 총관리자 (SecurityConfig /api/v1/admin/**).
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminModelApiController {

    private final AdminModelService adminModelService;
    private final AdminModelTrafficService adminModelTrafficService;
    private final AdminModelServerService adminModelServerService;

    // GET /api/v1/admin/model-report?run=계열/폴더 — run 이 없으면 기본 폴더. 호출: AdminModelsPanel.jsx → adminApi.getModelReport
    @GetMapping("/model-report")
    public ApiResponse<AdminModelReport> report(@RequestParam(required = false) String run) {
        return ApiResponse.ok(adminModelService.getReport(run));
    }

    // GET /api/v1/admin/models — 학습 결과 폴더 비교 + 추천 서버 · 비율 · 사용량. 호출: AdminModelsPanel.jsx → adminApi.getModels
    @GetMapping("/models")
    public ApiResponse<AdminModelComparison> models() {
        return ApiResponse.ok(adminModelService.getComparison());
    }

    // PUT /api/v1/admin/model-traffic — 모델별 비율 전체 바꾸기 (총관리자만, SecurityConfig). 운영 로그에 남는다
    // 호출: ModelTrafficCard.jsx → adminApi.updateModelTraffic
    @PutMapping("/model-traffic")
    public ApiResponse<Void> updateTraffic(@AuthenticationPrincipal Long userId, @Valid @RequestBody ModelTrafficRequest request) {
        adminModelTrafficService.updateAllocations(userId, request.allocations());
        return ApiResponse.ok(null);
    }

    // GET /api/v1/admin/recommendation-candidates — 추천 후보 차량 전체 (281건 정도라 화면이 검색 · 페이지를 나눈다)
    // 호출: AdminRecommendationsPanel.jsx → adminApi.getRecommendationCandidates
    @GetMapping("/recommendation-candidates")
    public ApiResponse<AdminCandidateList> candidates() {
        return ApiResponse.ok(adminModelService.getCandidates());
    }

    // POST /api/v1/admin/model-servers { runId } — 그 모델로 추천 서버 켜기 (총관리자만). 켜는 데 몇 초 걸려 202 + STARTING
    // 호출: ModelTrafficCard.jsx [켜기] → adminApi.startModelServer
    @PostMapping("/model-servers")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<ModelServerResponse> startServer(@AuthenticationPrincipal Long userId,
                                                        @Valid @RequestBody ModelServerRequest request) {
        return ApiResponse.ok(adminModelServerService.start(userId, request.runId()));
    }

    // DELETE /api/v1/admin/model-servers/{port} — 관리자 화면에서 켠 추천 서버 끄기 (총관리자만). 비율이 남아 있으면 409
    // 호출: ModelTrafficCard.jsx [끄기] → adminApi.stopModelServer
    @DeleteMapping("/model-servers/{port}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void stopServer(@AuthenticationPrincipal Long userId, @PathVariable int port) {
        adminModelServerService.stop(userId, port);
    }
}
