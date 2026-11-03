package com.kh.back.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.common.exception.ApiException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

// 보완 13: 인증 메일을 보낼 때마다 성공 · 실패 · 개발 모드를 운영 로그 표에 기록하고, 받는 사람은 가린 주소로
class VerificationMailSenderTests {

    private final JavaMailSender javaMailSender = mock(JavaMailSender.class);
    private final MailSendLogger sendLogger = mock(MailSendLogger.class);

    private VerificationMailSender sender(String username) {
        when(javaMailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        return new VerificationMailSender(javaMailSender, sendLogger, username, username.isEmpty() ? "" : "app-password");
    }

    @Test
    void 보내면_성공으로_기록한다() {
        sender("project@example.com").send("abcd@gmail.com", "123456");
        verify(sendLogger).record("abcd@gmail.com", true, false, null);
    }

    @Test
    void 실패하면_사유와_함께_기록하고_503() {
        doThrow(new MailSendException("connection refused")).when(javaMailSender).send(any(MimeMessage.class));

        assertThatThrownBy(() -> sender("project@example.com").send("abcd@gmail.com", "123456"))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("MAIL_SEND_FAILED"));
        verify(sendLogger).record(eq("abcd@gmail.com"), eq(false), eq(false),
                startsWith("MailSendException: connection refused"));
    }

    @Test
    void 메일_계정이_없으면_개발_모드로_기록한다() {
        sender("").send("abcd@gmail.com", "123456");
        verify(sendLogger).record("abcd@gmail.com", true, true, null);
    }

    @Test
    void 받는_사람은_앞_한_글자와_도메인만_남긴다() {
        assertThat(MailSendLogger.mask("abcd@gmail.com")).isEqualTo("a***@gmail.com");
        assertThat(MailSendLogger.mask("broken")).isEqualTo("***");
    }

    @Test
    void 기록을_못_남겨도_예외를_던지지_않는다() {
        AdminAuditLogMapper mapper = mock(AdminAuditLogMapper.class);
        doThrow(new DataAccessResourceFailureException("db down")).when(mapper).insert(any(), any(), any(), any(), any());

        new MailSendLogger(mapper).record("abcd@gmail.com", false, false, "MailSendException: x");

        // 운영 로그 표에: 누가 = 비움, 작업 = MAIL_FAILED, 대상 종류 = MAIL, 내용 = 가린 주소 · 사유
        verify(mapper).insert(null, MailSendLogger.FAILED, MailSendLogger.TARGET_TYPE, null, "a***@gmail.com · MailSendException: x");
    }
}
