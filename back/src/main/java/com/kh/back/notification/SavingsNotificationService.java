package com.kh.back.notification;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import com.kh.back.common.exception.ApiException;

@Service
@RequiredArgsConstructor
public class SavingsNotificationService {
    private final SavingsNotificationRepository repository;
    private final NotificationStream stream;

    public List<SavingsNotificationResponse> list(long userId) { return repository.list(userId); }

    public void record(long userId, SavingsNotificationRequest request) {
        boolean goal = request.type() == SavingsNotificationRequest.Type.GOAL_REACHED;
        String amount = request.amount().stripTrailingZeros().toPlainString();
        String title = goal ? "드림카 목표 자금을 모두 모았어요!" : "정기 저축이 기록됐어요";
        String message = goal ? "저축 실행 현황에서 달성한 목표를 확인해 보세요."
                : "정기 저축 " + amount + "만 원이 자동 기록됐어요. 실제 계좌 입금을 확인한 내역은 아닙니다.";
        if (repository.insert(userId, request, title, message)) stream.changed(userId);
    }

    public void markRead(long userId, long id) {
        if (!repository.markRead(userId, id)) throw new ApiException(HttpStatus.NOT_FOUND,"NOTIFICATION_NOT_FOUND","알림을 찾을 수 없습니다.");
        stream.changed(userId);
    }
    public void delete(long userId,long id) { repository.delete(userId,id); stream.changed(userId); }
    public java.util.Map<String,Boolean> preferences(long userId) { return repository.preferences(userId); }
    public void preference(long userId,SavingsNotificationRequest.Type type,boolean enabled) {
        repository.preference(userId,type,enabled); stream.changed(userId);
    }
}

