package com.kh.back.notification;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class NotificationControlsTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired SavingsNotificationRepository repository;
    @Autowired SavingsNotificationService notificationService;

    private long member() {
        String email="notification-test-"+UUID.randomUUID()+"@test.invalid";
        jdbc.update("INSERT INTO users(email,password_hash,nick_name,role) VALUES(?,'TEST_NO_LOGIN',?,'USER')",email,"test-"+UUID.randomUUID().toString().substring(0,12));
        return jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,email);
    }

    @Test void consultationReplyIsVisibleOnlyToItsRecipientAndCannotBeDuplicated() {
        long owner = member(), other = member();
        notificationService.notifyChat(owner, SavingsNotificationRequest.Type.CHAT_REPLY, "chat-reply:25", "상담 답변", "새 답변을 확인해 주세요.");
        notificationService.notifyChat(owner, SavingsNotificationRequest.Type.CHAT_REPLY, "chat-reply:25", "상담 답변", "새 답변을 확인해 주세요.");

        var notifications = repository.list(owner);
        assertEquals(1, notifications.size());
        var reply = notifications.get(0);
        assertEquals("CHAT_REPLY", reply.type());
        assertEquals("/mypage/consultation", reply.href());
        assertFalse(reply.read());
        assertTrue(repository.list(other).isEmpty());
        assertFalse(repository.markRead(other, reply.id()));
        assertTrue(repository.markRead(owner, reply.id()));
    }

    @Test void consultationReplyCanBeMutedAndEnabledAgain() {
        long owner = member();
        assertTrue(repository.preferences(owner).get("CHAT_REPLY"));
        repository.preference(owner, SavingsNotificationRequest.Type.CHAT_REPLY, false);
        notificationService.notifyChat(owner, SavingsNotificationRequest.Type.CHAT_REPLY, "chat-reply:25", "상담 답변", "새 답변을 확인해 주세요.");
        assertFalse(repository.preferences(owner).get("CHAT_REPLY"));
        assertTrue(repository.list(owner).isEmpty());

        repository.preference(owner, SavingsNotificationRequest.Type.CHAT_REPLY, true);
        notificationService.notifyChat(owner, SavingsNotificationRequest.Type.CHAT_REPLY, "chat-reply:26", "상담 답변", "새 답변을 확인해 주세요.");
        assertEquals(1, repository.list(owner).size());
    }

    @Test void deletionPersistsAndReplayCannotRestoreTheNotification() {
        long member=member();
        var event=new SavingsNotificationRequest("goal:plan",SavingsNotificationRequest.Type.GOAL_REACHED,BigDecimal.TEN);
        assertTrue(repository.insert(member,event,"목표","달성"));
        long id=repository.list(member).get(0).id();
        repository.delete(member,id);
        assertTrue(repository.list(member).isEmpty());
        assertFalse(repository.insert(member,event,"목표","달성"));
    }

    @Test void mutedTypeDoesNotBlockOtherTypesAndCanBeEnabledAgain() {
        long member=member();
        repository.preference(member,SavingsNotificationRequest.Type.RECURRING_RECORDED,false);
        var recurring=new SavingsNotificationRequest("recurring:p:r",SavingsNotificationRequest.Type.RECURRING_RECORDED,BigDecimal.ONE);
        assertFalse(repository.insert(member,recurring,"정기","기록"));
        assertTrue(repository.insert(member,new SavingsNotificationRequest("goal:p",SavingsNotificationRequest.Type.GOAL_REACHED,BigDecimal.TEN),"목표","달성"));
        assertFalse(repository.preferences(member).get("RECURRING_RECORDED"));
        repository.preference(member,SavingsNotificationRequest.Type.RECURRING_RECORDED,true);
        assertTrue(repository.insert(member,recurring,"정기","기록"));
    }

    @Test void anotherMemberCannotDeleteOrReadMyNotification() {
        long owner=member(),other=member();
        repository.insert(owner,new SavingsNotificationRequest("goal:p",SavingsNotificationRequest.Type.GOAL_REACHED,BigDecimal.TEN),"목표","달성");
        long id=repository.list(owner).get(0).id();
        repository.delete(other,id);
        assertFalse(repository.markRead(other,id));
        assertEquals(1,repository.list(owner).size());
        assertFalse(repository.list(owner).get(0).read());
    }
}
