package com.kh.back.notification;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class SavingsNotificationRepository {
    private final JdbcTemplate jdbc;

    public boolean insert(long userId, SavingsNotificationRequest request, String title, String message) {
        return insert(userId, request.eventKey(), request.type().name(), title, message);
    }

    boolean insert(long userId, String eventKey, String type, String title, String message) {
        // 재연결·여러 탭의 동일 이벤트 재전송은 고유 키로 멱등 처리한다.
        return jdbc.update("INSERT IGNORE INTO savings_notifications(user_id,event_key,title,message,notification_type) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM savings_notification_preferences WHERE user_id=? AND notification_type=? AND enabled=FALSE)",
                userId, eventKey, title, message, type, userId, type) == 1;
    }

    public List<SavingsNotificationResponse> list(long userId) {
        return jdbc.query("SELECT * FROM savings_notifications WHERE user_id=? AND is_deleted=FALSE ORDER BY id DESC",
                (rs, n) -> new SavingsNotificationResponse(rs.getLong("id"), userId, rs.getString("title"),
                        rs.getString("message"), rs.getBoolean("is_read"), rs.getTimestamp("created_at").toLocalDateTime(),
                        NotificationType.CONSULTATION_REPLY.name().equals(rs.getString("notification_type"))
                                ? "/mypage/consultation" : "/dream-car/progress",
                        rs.getString("notification_type")), userId);
    }

    public boolean markRead(long userId, long id) {
        return jdbc.update("UPDATE savings_notifications SET is_read=TRUE WHERE user_id=? AND id=? AND is_deleted=FALSE", userId, id) == 1;
    }
    public void delete(long userId, long id) {
        jdbc.update("UPDATE savings_notifications SET is_deleted=TRUE WHERE user_id=? AND id=?", userId,id);
    }
    public java.util.Map<String,Boolean> preferences(long userId) {
        var result = new java.util.HashMap<String,Boolean>();
        for (var type : NotificationType.values()) result.put(type.name(),true);
        jdbc.query("SELECT notification_type,enabled FROM savings_notification_preferences WHERE user_id=?",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> result.put(rs.getString(1),rs.getBoolean(2)),userId);
        return result;
    }
    public void preference(long userId, NotificationType type, boolean enabled) {
        jdbc.update("INSERT INTO savings_notification_preferences(user_id,notification_type,enabled) VALUES(?,?,?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled)",userId,type.name(),enabled);
    }
}

