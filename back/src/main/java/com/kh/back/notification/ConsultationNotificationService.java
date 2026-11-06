package com.kh.back.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class ConsultationNotificationService {
    private final SavingsNotificationRepository repository;
    private final NotificationStream stream;

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordReply(long memberId, long messageId) {
        boolean inserted = repository.insert(memberId, "consultation-reply:" + messageId,
                NotificationType.CONSULTATION_REPLY.name(), "1:1 상담 답변이 도착했어요",
                "상담원이 보낸 답변을 확인해 보세요.");
        if (inserted) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    stream.changed(memberId);
                }
            });
        }
    }
}
