package com.kh.back.member.dto;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * 보완 9: user_agreements 1행 (가입 동의 시각).
 * 11-05: [선택] 차량 추천 업데이트 수신 · 이메일 알림 설정은 없앴다 — 칸(email_notification · updates_agreed_at)은 V14 그대로 두고 기본값만 넣는다
 */
@Getter
@Setter
public class UserAgreementDto {

    public static final String DEFAULT_NOTIFICATION = "IMPORTANT";

    private Long userId;
    private LocalDateTime termsAgreedAt;
    private LocalDateTime privacyAgreedAt;
    private String emailNotification;   // 11-05 부터 쓰지 않음 (늘 IMPORTANT)
    private LocalDateTime updatesAgreedAt; // 11-05 부터 쓰지 않음 (늘 null)

    // 가입할 때: 필수 동의 2개(서비스 이용약관 · 개인정보 수집 · 이용)는 지금 시각
    public static UserAgreementDto atSignup(Long userId, LocalDateTime now) {
        UserAgreementDto agreement = new UserAgreementDto();
        agreement.setUserId(userId);
        agreement.setTermsAgreedAt(now);
        agreement.setPrivacyAgreedAt(now);
        agreement.setEmailNotification(DEFAULT_NOTIFICATION);
        return agreement;
    }

}
