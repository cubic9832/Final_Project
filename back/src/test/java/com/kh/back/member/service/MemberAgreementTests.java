package com.kh.back.member.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.kh.back.member.dto.UserAgreementDto;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

// 보완 9 · 11-05: 가입할 때 필수 약관 2개의 동의 시각만 남긴다 ([선택] 추천 업데이트 수신 · 이메일 알림 설정은 없앰)
class MemberAgreementTests {

    @Test
    void 가입할_때_필수_약관_동의_시각을_남기고_선택_동의는_없다() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 5, 16, 0);
        UserAgreementDto agreement = UserAgreementDto.atSignup(1L, now);
        assertThat(agreement.getTermsAgreedAt()).isEqualTo(now);
        assertThat(agreement.getPrivacyAgreedAt()).isEqualTo(now);
        assertThat(agreement.getUpdatesAgreedAt()).isNull();
    }
}
