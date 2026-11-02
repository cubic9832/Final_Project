package com.kh.back.auth.service;

import com.kh.back.admin.mapper.AdminAuditLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 보완 13: 메일을 보낼 때마다 성공 · 실패를 운영 로그 표(admin_audit_logs)에 남긴다 (관리자 운영 현황 "메일 발송").
 * 새 표를 만들지 않고 기존 운영 로그 표를 쓴다: 누가 = 비움(서버가 자동으로 한 일), 대상 종류 = MAIL,
 * 작업 = MAIL_SENT · MAIL_FAILED, 내용 = 가린 주소(+ 개발 모드 · 실패 사유). 코드 · 메일 내용은 남기지 않는다.
 *
 * REQUIRES_NEW = 부른 쪽과 따로 저장한다.
 *   인증 코드 발송은 "메일이 실패하면 코드 저장도 되돌리는" 트랜잭션 안에서 불린다 → 같은 트랜잭션이면 실패 기록까지 같이 사라진다.
 * 기록을 못 남겨도(DB 문제) 메일 발송 자체는 막지 않는다 → 로그만 찍는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MailSendLogger {

    public static final String TARGET_TYPE = "MAIL";
    public static final String SENT = "MAIL_SENT";
    public static final String FAILED = "MAIL_FAILED";

    private final AdminAuditLogMapper auditLogMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String email, boolean success, boolean devMode, String errorMessage) {
        String detail = mask(email) + (devMode ? " · 개발 모드 (서버 로그)" : "") + (errorMessage == null ? "" : " · " + errorMessage);
        try {
            auditLogMapper.insert(null, success ? SENT : FAILED, TARGET_TYPE, null, shorten(detail));
        } catch (DataAccessException e) {
            log.warn("mail send log not saved: {}", e.getMessage());
        }
    }

    // "abcd@gmail.com" → "a***@gmail.com" (앞 한 글자 + 도메인만 남긴다)
    static String mask(String email) {
        if (email == null) {
            return "(없음)";
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }

    // detail 칸은 255자
    private static String shorten(String text) {
        return text.length() <= 255 ? text : text.substring(0, 255);
    }
}
