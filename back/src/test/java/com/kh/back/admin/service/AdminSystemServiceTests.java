package com.kh.back.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.kh.back.admin.dto.AdminMailStatus;
import com.kh.back.admin.dto.AdminSystemStatus;
import com.kh.back.admin.mapper.AdminSystemMapper;
import com.kh.back.auth.service.VerificationMailSender;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

// 7단계: 서비스 연결 상태 — DB 가 응답하면 번호까지, 꺼져 있으면 예외 없이 "연결 안 됨"
// 보완 13: 메일 발송 — 설정 여부 + 최근 24시간 성공 · 실패 + 마지막 실패
class AdminSystemServiceTests {

    private final AdminSystemMapper adminSystemMapper = mock(AdminSystemMapper.class);
    private final VerificationMailSender mailSender = mock(VerificationMailSender.class);
    private final AdminSystemService service = new AdminSystemServiceImpl(adminSystemMapper, mailSender);

    @Test
    void 메일_발송_현황은_설정과_기록을_합친다() {
        LocalDateTime failedAt = LocalDateTime.of(2026, 11, 2, 9, 30);
        when(mailSender.isMailEnabled()).thenReturn(true);
        when(adminSystemMapper.countMailSince(true)).thenReturn(12);
        when(adminSystemMapper.countMailSince(false)).thenReturn(1);
        when(adminSystemMapper.findLastMailFailedAt()).thenReturn(failedAt);
        when(adminSystemMapper.findLastMailFailedReason()).thenReturn("MailAuthenticationException: Authentication failed");

        AdminMailStatus mail = service.getMailStatus();

        assertThat(mail).isEqualTo(new AdminMailStatus(true, 12, 1, failedAt, "MailAuthenticationException: Authentication failed"));
    }

    @Test
    void DB_가_응답하면_응답시간과_Flyway_번호를_준다() {
        when(adminSystemMapper.ping()).thenReturn(1);
        when(adminSystemMapper.findLatestMigration()).thenReturn("14");

        AdminSystemStatus status = service.getStatus();

        assertThat(status.apiStartedAt()).isNotNull();
        assertThat(status.databaseUp()).isTrue();
        assertThat(status.databaseMillis()).isNotNull();
        assertThat(status.databaseVersion()).isEqualTo("14");
    }

    @Test
    void DB_연결이_안_되면_예외_없이_연결_안_됨() {
        when(adminSystemMapper.ping()).thenThrow(new DataAccessResourceFailureException("down"));

        AdminSystemStatus status = service.getStatus();

        assertThat(status.databaseUp()).isFalse();
        assertThat(status.databaseMillis()).isNull();
        assertThat(status.databaseVersion()).isNull();
    }
}
