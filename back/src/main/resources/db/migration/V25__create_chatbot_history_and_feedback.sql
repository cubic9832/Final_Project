CREATE TABLE chatbot_conversations (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 ended_at DATETIME(6) NULL,
 INDEX idx_chatbot_active_user (user_id, ended_at, id),
 CONSTRAINT fk_chatbot_conversation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE chatbot_messages (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 conversation_id BIGINT NOT NULL,
 role VARCHAR(12) NOT NULL,
 content TEXT NOT NULL,
 reply_to_message_id BIGINT NULL,
 question_source VARCHAR(20) NULL,
 guide_id VARCHAR(80) NULL,
 answer_type VARCHAR(12) NULL,
 provider VARCHAR(20) NULL,
 model VARCHAR(120) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 INDEX idx_chatbot_messages_conversation (conversation_id, id),
 UNIQUE KEY uk_chatbot_reply (reply_to_message_id),
 CONSTRAINT chk_chatbot_message_role CHECK (role IN ('USER', 'ASSISTANT')),
 CONSTRAINT fk_chatbot_message_conversation FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
 CONSTRAINT fk_chatbot_message_question FOREIGN KEY (reply_to_message_id) REFERENCES chatbot_messages(id) ON DELETE CASCADE
);

CREATE TABLE chatbot_feedback (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 answer_message_id BIGINT NOT NULL,
 rating VARCHAR(10) NOT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 UNIQUE KEY uk_chatbot_feedback_answer (answer_message_id),
 CONSTRAINT chk_chatbot_feedback_rating CHECK (rating IN ('LIKE', 'DISLIKE')),
 CONSTRAINT fk_chatbot_feedback_answer FOREIGN KEY (answer_message_id) REFERENCES chatbot_messages(id) ON DELETE CASCADE
);
