package com.kh.back.chatbot.repository;

import com.kh.back.chatbot.dto.ChatHistoryResponse;
import com.kh.back.chatbot.util.PiiMasker;
import com.kh.back.common.exception.ApiException;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
@RequiredArgsConstructor
public class ChatHistoryRepository {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public record StoredPair(long questionId, long answerId) {}
    public record MessagePage(List<ChatHistoryResponse.Message> messages, boolean hasMore, boolean hasNewer) {}
    public record Exchange(long answerId, long conversationId, long userId, String userName, String question, String answer,
                           String questionSource, String guideId, String answerType, String provider,
                           String model, String rating, LocalDateTime createdAt, long number, Long promptVersionId, String promptVersion) {}
    public record RatingCounts(long likes, long dislikes, long unrated) {}
    public record ExchangePage(List<Exchange> items, boolean hasMore, int page, long total, long totalPages, RatingCounts ratingCounts, String promptVersion) {}

    private final RowMapper<ChatHistoryResponse.Message> messageMapper = (rs, index) -> new ChatHistoryResponse.Message(
        rs.getLong("id"), rs.getString("role").equals("USER") ? "user" : "model",
        PiiMasker.mask(rs.getString("content")), rs.getString("rating"));

    public Long activeConversation(long userId) {
        return jdbc.query("SELECT id FROM chatbot_conversations WHERE user_id=? AND ended_at IS NULL",
            (rs, n) -> rs.getLong(1), userId).stream().findFirst().orElse(null);
    }

    public StoredPair savePair(long userId, String question, String answer, String source, String guideId,
                               String answerType, String provider, String model) {
        return savePair(userId, question, answer, source, guideId, answerType, provider, model, null);
    }

    public StoredPair savePair(long userId, String question, String answer, String source, String guideId,
                               String answerType, String provider, String model, Long promptVersionId) {
        return transactions.execute(status -> {
            // Serialize creation/reset for this member, including concurrent application instances.
            lockMember(userId);
            Long current = activeConversation(userId);
            long conversation = current == null
                ? insert("INSERT INTO chatbot_conversations(user_id) VALUES(?)", userId) : current;
            long questionId = insert("INSERT INTO chatbot_messages(conversation_id,role,content,question_source,guide_id) VALUES(?,'USER',?,?,?)",
                conversation, PiiMasker.mask(question), source, guideId);
            long answerId = insert("INSERT INTO chatbot_messages(conversation_id,role,content,reply_to_message_id,answer_type,provider,model,prompt_version_id) VALUES(?,'ASSISTANT',?,?,?,?,?,?)",
                conversation, PiiMasker.mask(answer), questionId, answerType, provider, model, promptVersionId);
            jdbc.update("UPDATE chatbot_conversations SET updated_at=CURRENT_TIMESTAMP(6) WHERE id=?", conversation);
            return new StoredPair(questionId, answerId);
        });
    }

    public MessagePage history(long userId, Long beforeId, int size) {
        Long conversation = activeConversation(userId);
        return conversation == null ? new MessagePage(List.of(), false, false) : conversationMessages(conversation, beforeId, size);
    }

    public MessagePage conversationMessages(long conversation, Long beforeId, int size) {
        var messages = new ArrayList<>(jdbc.query("SELECT m.*,f.rating FROM chatbot_messages m LEFT JOIN chatbot_feedback f ON f.answer_message_id=m.id WHERE m.conversation_id=? AND m.id<? ORDER BY m.id DESC LIMIT ?",
            messageMapper, conversation, beforeId == null ? Long.MAX_VALUE : beforeId, size + 1));
        boolean more = messages.size() > size;
        if (more) messages.remove(messages.size() - 1);
        Collections.reverse(messages);
        boolean newer = beforeId != null && Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM chatbot_messages WHERE conversation_id=? AND id>=?)", Boolean.class, conversation, beforeId));
        return new MessagePage(List.copyOf(messages), more, newer);
    }

    public void startNewConversation(long userId) {
        transactions.executeWithoutResult(status -> {
            lockMember(userId);
            jdbc.update("UPDATE chatbot_conversations SET ended_at=CURRENT_TIMESTAMP(6) WHERE user_id=? AND ended_at IS NULL", userId);
        });
    }

    public void feedback(long userId, long answerId, String rating) {
        transactions.executeWithoutResult(status -> {
            // Ownership and assistant role are checked on the server; no question/answer text is accepted from the browser.
            var owners = jdbc.query("SELECT m.id FROM chatbot_messages m JOIN chatbot_conversations c ON c.id=m.conversation_id WHERE m.id=? AND m.role='ASSISTANT' AND c.user_id=? FOR UPDATE",
                (rs, n) -> rs.getLong(1), answerId, userId);
            if (owners.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "CHAT_MESSAGE_NOT_FOUND", "평가할 답변을 찾을 수 없습니다.");
            if (rating == null) jdbc.update("DELETE FROM chatbot_feedback WHERE answer_message_id=?", answerId);
            else jdbc.update("INSERT INTO chatbot_feedback(answer_message_id,rating) VALUES(?,?) ON DUPLICATE KEY UPDATE rating=VALUES(rating),updated_at=CURRENT_TIMESTAMP(6)", answerId, rating);
        });
    }

    public boolean conversationExists(long conversation) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM chatbot_conversations WHERE id=?)", Boolean.class, conversation));
    }

    public ExchangePage exchanges(String rating, int page, String keyword) {
        return exchanges(rating, page, keyword, "", "ASC");
    }

    public ExchangePage exchanges(String rating, int page, String keyword, String sort, String direction) {
        return exchanges(rating, page, keyword, sort, direction, null);
    }

    public ExchangePage exchanges(String rating, int page, String keyword, String sort, String direction, Long promptVersionId) {
        // SQL identifiers and directions are selected only from this allowlist.
        String column = switch (sort) {
            case "number" -> "a.id";
            case "question" -> "q.content";
            case "member" -> "u.nick_name";
            case "source" -> "CASE q.question_source WHEN 'DIRECT_INPUT' THEN '직접 입력' WHEN 'QUICK_QUESTION' THEN '추천 질문' ELSE '용어 클릭' END";
            case "answer" -> "CASE a.answer_type WHEN 'FIXED' THEN '고정' ELSE 'AI' END";
            case "rating" -> "CASE f.rating WHEN 'LIKE' THEN 0 WHEN 'DISLIKE' THEN 1 ELSE 2 END";
            case "createdAt" -> "a.created_at";
            case "" -> "a.id";
            default -> throw new IllegalArgumentException("Unsupported sort field");
        };
        if (!direction.equals("ASC") && !direction.equals("DESC")) throw new IllegalArgumentException("Unsupported sort direction");
        String order = sort.isEmpty() ? "a.id DESC" : column + " " + direction + ", a.id DESC";
        String filter = switch (rating) {
            case "LIKE", "DISLIKE" -> " AND f.rating=?";
            case "UNRATED" -> " AND f.id IS NULL";
            default -> "";
        };
        var parameters = new ArrayList<Object>();
        if (rating.equals("LIKE") || rating.equals("DISLIKE")) parameters.add(rating);
        String searchedVersion = null;
        var words = new ArrayList<String>();
        var registeredVersions = jdbc.queryForList("SELECT version FROM chatbot_prompt_versions", String.class);
        for (String word : keyword.strip().split("\\s+")) {
            if (word.isBlank()) continue;
            boolean versionWord = word.matches("(?i)v[0-9]+(?:[._-][a-z0-9]+)*")
                || registeredVersions.stream().anyMatch(version -> version.equalsIgnoreCase(word));
            if (versionWord) {
                if (searchedVersion != null && !searchedVersion.equalsIgnoreCase(word))
                    throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "프롬프트 버전은 한 번에 하나씩 검색해 주세요.");
                searchedVersion = registeredVersions.stream().filter(version -> version.equalsIgnoreCase(word)).findFirst().orElse(word);
            } else words.add(word);
        }
        keyword = String.join(" ", words);
        if (searchedVersion != null) {
            filter += " AND a.answer_type='AI' AND p.version=?";
            parameters.add(searchedVersion);
        }
        if (!keyword.isBlank()) {
            filter += " AND (q.content LIKE ? ESCAPE '!' OR u.nick_name LIKE ? ESCAPE '!')";
            parameters.add("%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
            parameters.add("%" + keyword.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
        }
        if (promptVersionId != null) {
            filter += promptVersionId == 0 ? " AND a.answer_type='AI' AND a.prompt_version_id IS NULL" : " AND a.answer_type='AI' AND a.prompt_version_id=?";
            if (promptVersionId != 0) parameters.add(promptVersionId);
        }
        if (promptVersionId != null && searchedVersion == null && promptVersionId > 0) {
            searchedVersion = jdbc.queryForList("SELECT version FROM chatbot_prompt_versions WHERE id=?", String.class, promptVersionId).stream().findFirst().orElse(null);
        }
        String from = " FROM chatbot_messages a JOIN chatbot_messages q ON q.id=a.reply_to_message_id JOIN chatbot_conversations c ON c.id=a.conversation_id JOIN users u ON u.id=c.user_id LEFT JOIN chatbot_feedback f ON f.answer_message_id=a.id LEFT JOIN chatbot_prompt_versions p ON p.id=a.prompt_version_id WHERE a.role='ASSISTANT'" + filter;
        RatingCounts counts = Objects.requireNonNull(jdbc.queryForObject("SELECT COUNT(CASE WHEN f.rating='LIKE' THEN 1 END) AS likes,COUNT(CASE WHEN f.rating='DISLIKE' THEN 1 END) AS dislikes,COUNT(CASE WHEN f.id IS NULL THEN 1 END) AS unrated" + from,
            (rs, n) -> new RatingCounts(rs.getLong("likes"), rs.getLong("dislikes"), rs.getLong("unrated")), parameters.toArray()));
        long total = counts.likes() + counts.dislikes() + counts.unrated();
        parameters.add(page * 20);
        var rows = jdbc.query("SELECT ROW_NUMBER() OVER (ORDER BY a.id ASC) AS row_ordinal,a.id,a.conversation_id,c.user_id,u.nick_name AS user_name,q.content AS question,a.content AS answer,q.question_source,q.guide_id,a.answer_type,a.provider,a.model,f.rating,a.created_at,a.prompt_version_id,p.version AS prompt_version" + from + " ORDER BY " + order + " LIMIT 20 OFFSET ?",
            (rs, n) -> new Exchange(rs.getLong("id"),rs.getLong("conversation_id"),rs.getLong("user_id"),rs.getString("user_name"),PiiMasker.mask(rs.getString("question")),PiiMasker.mask(rs.getString("answer")),rs.getString("question_source"),rs.getString("guide_id"),rs.getString("answer_type"),rs.getString("provider"),rs.getString("model"),rs.getString("rating"),rs.getTimestamp("created_at").toLocalDateTime(),rs.getLong("row_ordinal"),rs.getObject("prompt_version_id",Long.class),rs.getString("prompt_version")), parameters.toArray());
        return new ExchangePage(List.copyOf(rows), (page + 1L) * 20 < total, page, total, Math.max(1, (total + 19) / 20), counts, searchedVersion);
    }

    private void lockMember(long userId) {
        if (jdbc.query("SELECT id FROM users WHERE id=? FOR UPDATE", (rs, n) -> rs.getLong(1), userId).isEmpty())
            throw new ApiException(HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", "로그인이 필요합니다.");
    }

    private long insert(String sql, Object... arguments) {
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int i=0; i<arguments.length; i++) statement.setObject(i+1, arguments[i]);
            return statement;
        }, key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }
}
