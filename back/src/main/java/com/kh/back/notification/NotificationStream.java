package com.kh.back.notification;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class NotificationStream {
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> clients = new ConcurrentHashMap<>();

    public SseEmitter subscribe(long userId) {
        // 짧은 연결 단위로 JWT를 재검증하고 재연결 시 DB 목록을 다시 조회한다.
        SseEmitter emitter = new SseEmitter(60_000L);
        clients.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);
        Runnable remove = () -> clients.computeIfPresent(userId, (key, list) -> { list.remove(emitter); return list.isEmpty() ? null : list; });
        emitter.onCompletion(remove);
        emitter.onTimeout(() -> { remove.run(); emitter.complete(); });
        emitter.onError(error -> remove.run());
        send(emitter, "ready");
        return emitter;
    }

    public void changed(long userId) {
        for (SseEmitter emitter : clients.getOrDefault(userId, new CopyOnWriteArrayList<>())) send(emitter, "changed");
    }

    @Scheduled(fixedDelay=20_000)
    public void heartbeat() {
        clients.values().forEach(list -> list.forEach(emitter -> send(emitter, "heartbeat")));
    }

    private void send(SseEmitter emitter, String event) {
        try { emitter.send(SseEmitter.event().name(event).data("{}")); }
        catch (IOException | IllegalStateException failure) { emitter.completeWithError(failure); }
    }
}
