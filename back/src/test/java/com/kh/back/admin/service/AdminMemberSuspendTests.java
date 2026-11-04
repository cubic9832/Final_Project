package com.kh.back.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.admin.mapper.AdminMemberMapper;
import com.kh.back.auth.mapper.RefreshTokenMapper;
import com.kh.back.auth.service.LoginAttemptLimiter;
import com.kh.back.chat.service.ChatRoomService;
import com.kh.back.common.exception.ApiException;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// 9단계: 계정 정지 — 관리자 · 총관리자(11-03), 일반 회원만, 자기 자신 안 됨, 정지하면 모든 기기 로그아웃 + 운영 로그
@ExtendWith(MockitoExtension.class)
class AdminMemberSuspendTests {

    @Mock AdminMemberMapper adminMemberMapper;
    @Mock LoginAttemptLimiter loginAttemptLimiter;
    @Mock RefreshTokenMapper refreshTokenMapper;
    @Mock AdminAuditLogMapper adminAuditLogMapper;
    @Mock ChatRoomService chatRoomService;
    @InjectMocks AdminMemberServiceImpl service;

    static final Long SUPER = 1L;
    static final Long ADMIN = 2L;
    static final Long MEMBER = 7L;

    private static void assertCode(Runnable call, String code) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo(code));
    }

    @Test
    void 총관리자가_일반_회원을_7일_정지하면_로그아웃_상담_종료되고_운영_로그에_남는다() {
        when(adminMemberMapper.findRole(MEMBER)).thenReturn("USER");

        service.suspend(SUPER, MEMBER, 7, " 부적절한 이용 ");

        ArgumentCaptor<LocalDateTime> until = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(adminMemberMapper).suspend(eq(MEMBER), until.capture());
        assertThat(until.getValue()).isBetween(LocalDateTime.now().plusDays(7).minusMinutes(1), LocalDateTime.now().plusDays(7));
        verify(refreshTokenMapper).deleteByUserId(MEMBER);
        verify(chatRoomService).closeForSuspension(MEMBER); // 대기 · 진행 중 상담 종료
        verify(adminAuditLogMapper).insert(SUPER, "MEMBER_SUSPEND", "MEMBER", MEMBER, "계정 정지 7일 (부적절한 이용)");
    }

    @Test
    void 영구_정지는_9999년으로_저장한다() {
        when(adminMemberMapper.findRole(MEMBER)).thenReturn("USER");

        service.suspend(SUPER, MEMBER, 0, "기타");

        ArgumentCaptor<LocalDateTime> until = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(adminMemberMapper).suspend(eq(MEMBER), until.capture());
        assertThat(until.getValue().getYear()).isEqualTo(9999);
        verify(adminAuditLogMapper).insert(SUPER, "MEMBER_SUSPEND", "MEMBER", MEMBER, "계정 정지 영구 (기타)");
    }

    @Test
    void 일반_관리자도_정지하고_풀_수_있다() { // 11-03: 총관리자에게 몰린 일을 나눔
        when(adminMemberMapper.findRole(MEMBER)).thenReturn("USER");
        service.suspend(ADMIN, MEMBER, 7, "기타");
        service.unsuspend(ADMIN, MEMBER);
        verify(adminMemberMapper).suspend(eq(MEMBER), any());
        verify(adminAuditLogMapper).insert(ADMIN, "MEMBER_UNSUSPEND", "MEMBER", MEMBER, "계정 정지 풀기");
    }

    @Test
    void 관리자_계정과_자기_자신은_정지할_수_없다() {
        when(adminMemberMapper.findRole(ADMIN)).thenReturn("ADMIN");
        assertCode(() -> service.suspend(SUPER, ADMIN, 7, "기타"), "ADMIN_SUSPEND");
        assertCode(() -> service.suspend(SUPER, SUPER, 7, "기타"), "SELF_SUSPEND");
        verify(refreshTokenMapper, never()).deleteByUserId(anyLong());
    }

    @Test
    void 정지를_풀면_운영_로그에_남는다() {
        when(adminMemberMapper.findRole(MEMBER)).thenReturn("USER");

        service.unsuspend(SUPER, MEMBER);

        verify(adminMemberMapper).unsuspend(MEMBER);
        verify(adminAuditLogMapper).insert(SUPER, "MEMBER_UNSUSPEND", "MEMBER", MEMBER, "계정 정지 풀기");
    }
}
