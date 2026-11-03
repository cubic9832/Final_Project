package com.kh.back.member.service;

import com.kh.back.common.exception.ApiException;
import com.kh.back.member.dto.MemberDto;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.http.HttpStatus;

/**
 * 9단계: 계정 정지 규칙 한곳에 — 영구 정지 표시 · 안내 문구 · "정지 중이면 막기".
 * 로그인 · 구글 로그인 · 로그인 유지(AuthServiceImpl), 탈퇴(MemberServiceImpl), 정지하기(AdminMemberServiceImpl)가 같이 쓴다.
 */
public final class AccountSuspension {

    public static final int PERMANENT = 0;          // 정지 기간 0일 = 영구
    public static final int PERMANENT_YEAR = 9999;  // 영구 정지는 9999-12-31 로 저장 (상담 제한과 같은 방식)

    private static final DateTimeFormatter UNTIL = DateTimeFormatter.ofPattern("M월 d일 HH:mm");

    private AccountSuspension() {
    }

    // 정지 중이면 403 ACCOUNT_SUSPENDED (언제까지인지 안내). 정지 여부는 SQL 이 DB 시각으로 계산한 member.isSuspended()
    public static void requireActive(MemberDto member) {
        if (member.isSuspended()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", message(member.getSuspendedUntil()));
        }
    }

    // 기간(일) → 정지가 끝나는 시각. 0 이면 영구
    public static LocalDateTime until(int days, LocalDateTime now) {
        return days == PERMANENT ? LocalDateTime.of(PERMANENT_YEAR, 12, 31, 23, 59, 59) : now.plusDays(days);
    }

    public static String message(LocalDateTime until) {
        if (until == null || until.getYear() >= PERMANENT_YEAR) {
            return "이용이 영구 정지된 계정입니다.";
        }
        return "이용이 정지된 계정입니다. " + until.format(UNTIL) + "까지 로그인할 수 없습니다.";
    }
}
