package com.kh.back.chat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 11-05 (멘토링): 무응답 상담 자동 정리 — 1분마다 ChatRoomService.handleIdleRooms() 를 부른다.
 * 회원이 [상담 종료]를 누르지 않고 떠나도: 상담원 답 뒤 10분 → 경고, 그 뒤 5분 → 자동 종료.
 * 스케줄 켜기(@EnableScheduling)는 RefreshTokenCleanup 에 이미 있다 (앱 전체에 한 번이면 된다).
 * 테스트에서는 꺼 둔다 (src/test/resources/config/application.yml: chat.idle-close.enabled=false) — 설정이 없으면 켜짐.
 */
@Component
@ConditionalOnProperty(name = "chat.idle-close.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class ChatIdleScheduler {

    private final ChatRoomService chatRoomService;

    @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
    public void run() {
        chatRoomService.handleIdleRooms();
    }
}
