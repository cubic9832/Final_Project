package com.kh.back.notification;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import com.kh.back.common.exception.ApiException;

class SavingsNotificationServiceTests {
    @Test void duplicateEventsDoNotBroadcastAgain() {
        var repository = mock(SavingsNotificationRepository.class);
        var stream = mock(NotificationStream.class);
        var service = new SavingsNotificationService(repository, stream);
        var event = new SavingsNotificationRequest("goal:plan", SavingsNotificationRequest.Type.GOAL_REACHED, BigDecimal.valueOf(200));
        when(repository.insert(eq(7L), eq(event), anyString(), anyString())).thenReturn(true, false);
        service.record(7L,event);
        service.record(7L,event);
        verify(stream,times(1)).changed(7L);
    }

    @Test void recurringNotificationDistinguishesAutomaticRecordsFromBankDeposits() {
        var repository = mock(SavingsNotificationRepository.class);
        var service = new SavingsNotificationService(repository, mock(NotificationStream.class));
        var event = new SavingsNotificationRequest("recurring:plan:date", SavingsNotificationRequest.Type.RECURRING_RECORDED, new BigDecimal("0.50"));
        service.record(7L,event);
        verify(repository).insert(eq(7L), eq(event), eq("정기 저축이 기록됐어요"), contains("0.5만 원이 자동 기록됐어요. 실제 계좌 입금을 확인한 내역은 아닙니다."));
    }

    @Test void cannotReadAnotherMembersNotification() {
        var repository = mock(SavingsNotificationRepository.class);
        var stream = mock(NotificationStream.class);
        var service = new SavingsNotificationService(repository, stream);
        assertThrows(ApiException.class, () -> service.markRead(8L, 99L));
        verify(repository).markRead(8L,99L);
        verifyNoInteractions(stream);
    }
}
