package com.kh.back.notification;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** 브라우저에 저장된 저축 기록에서 발생한 회원 본인의 알림 이벤트. */
public record SavingsNotificationRequest(
        @NotBlank @Size(max=255) String eventKey,
        @NotNull Type type,
        @NotNull @DecimalMin("0.00") @DecimalMax("100000000000.00") BigDecimal amount) {
    // 11-05: CHAT_* 는 1:1 상담 알림 (서버의 ChatRoomServiceImpl 만 만든다 — 이 요청으로는 받지 않음)
    public enum Type { GOAL_REACHED, RECURRING_RECORDED, CHAT_REPLY, CHAT_IDLE_WARNING }
}
