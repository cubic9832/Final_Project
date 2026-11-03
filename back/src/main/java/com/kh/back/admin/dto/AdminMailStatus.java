package com.kh.back.admin.dto;

import java.time.LocalDateTime;

/**
 * 보완 13: 관리자 운영 현황의 "메일 발송" 줄 (최근 24시간, 운영 로그 표의 메일 기록 기준)
 *
 * @param mailEnabled       메일 계정이 설정되어 실제로 보내는지 (false 면 개발 모드 — 서버 로그로 대신)
 * @param sent              최근 24시간 보낸 수 (개발 모드 포함)
 * @param failed            최근 24시간 실패 수
 * @param lastFailedAt      마지막 실패 시각 (24시간과 상관없이, 없으면 null)
 * @param lastFailedReason  마지막 실패 사유 (예외 종류 · 메시지)
 */
public record AdminMailStatus(boolean mailEnabled, int sent, int failed, LocalDateTime lastFailedAt, String lastFailedReason) {
}
