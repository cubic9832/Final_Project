package com.kh.back.admin.service;

import com.kh.back.admin.dto.AdminMailStatus;
import com.kh.back.admin.dto.AdminSystemStatus;

// 7단계: 관리자 운영 현황 — 서비스 연결 상태
public interface AdminSystemService {

    // DB 가 꺼져 있어도 예외 없이 databaseUp = false 로 돌려준다
    AdminSystemStatus getStatus();

    // 보완 13: 메일 발송 최근 24시간 성공 · 실패 · 마지막 실패
    AdminMailStatus getMailStatus();
}
