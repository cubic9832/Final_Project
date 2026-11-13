package com.kh.back.admin.controller;

import com.kh.back.admin.dto.AdminAuditLogResponse;
import com.kh.back.admin.service.AdminAuditLogService;
import com.kh.back.common.dto.ApiResponse;
import com.kh.back.common.dto.PageMeta;
import com.kh.back.common.exception.ApiException;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

/**
 * 7단계: 운영 로그 (관리자 작업 기록, V15). 관리자 · 총관리자가 볼 수 있다 (SecurityConfig /api/v1/admin/**).
 */
@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
public class AdminAuditLogApiController {

    private final AdminAuditLogService adminAuditLogService;

    // GET /api/v1/admin/audit-logs?action=&page=1&size=20 — 최근 순 + 페이징 정보
    // 호출: AdminLogsPanel.jsx · AdminOverviewPanel.jsx(최근 3건) → adminApi.getAuditLogs
    @GetMapping
    public ApiResponse<List<AdminAuditLogResponse>> list(
            @RequestParam(required = false) String action,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String sort,
            @RequestParam(defaultValue = "ASC") String direction) {
        page = Math.max(page, 1);
        size = Math.min(Math.max(size, 1), 100);
        if (!Set.of("", "number", "createdAt", "detail", "actor", "action", "target").contains(sort)
                || !Set.of("ASC", "DESC").contains(direction)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SORT", "정렬 조건을 확인해 주세요.");
        }
        return ApiResponse.ok(adminAuditLogService.getLogs(action, page, size, sort, direction),
                PageMeta.of(page, size, adminAuditLogService.countLogs(action)));
    }
}
