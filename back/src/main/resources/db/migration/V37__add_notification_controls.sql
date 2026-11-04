ALTER TABLE savings_notifications
    ADD COLUMN notification_type VARCHAR(32) NOT NULL DEFAULT 'GOAL_REACHED',
    ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE savings_notifications SET notification_type='RECURRING_RECORDED' WHERE event_key LIKE 'recurring:%';
CREATE TABLE savings_notification_preferences (
    user_id BIGINT NOT NULL,
    notification_type VARCHAR(32) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY(user_id,notification_type),
    CONSTRAINT fk_savings_notification_preferences_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
