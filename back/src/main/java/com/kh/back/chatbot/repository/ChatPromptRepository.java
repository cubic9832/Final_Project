package com.kh.back.chatbot.repository;

import com.kh.back.common.exception.ApiException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
public class ChatPromptRepository {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public record Version(long id, String version, String content, String description, boolean active,
                          LocalDateTime createdAt, LocalDateTime activatedAt) {}
    public record ModelUsage(String provider, String model, long answers) {}
    private record VersionModelUsage(long versionId, ModelUsage usage) {}
    public record Statistics(Version prompt, long answers, long likes, long dislikes, long unrated,
                             List<ModelUsage> models) {}

    private static final org.springframework.jdbc.core.RowMapper<Version> MAPPER = (rs, n) -> new Version(
        rs.getLong("id"), rs.getString("version"), rs.getString("content"), rs.getString("description"),
        rs.getBoolean("is_active"), rs.getTimestamp("created_at").toLocalDateTime(),
        rs.getTimestamp("activated_at") == null ? null : rs.getTimestamp("activated_at").toLocalDateTime());

    public Version active() {
        return jdbc.query("SELECT * FROM chatbot_prompt_versions WHERE is_active=TRUE", MAPPER).stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CHAT_PROMPT_MISSING", "적용된 프롬프트가 없습니다. 관리자에게 문의해 주세요."));
    }

    @Transactional(readOnly = true)
    public List<Statistics> statistics() {
        // A version can have answers from several models. Count stored answer metadata,
        // independently of feedback, so unrated answers are included exactly once.
        var models = jdbc.query("""
            SELECT prompt_version_id,NULLIF(TRIM(provider),'') provider,NULLIF(TRIM(model),'') model,
                   COUNT(*) answers
            FROM chatbot_messages
            WHERE role='ASSISTANT' AND answer_type='AI' AND prompt_version_id IS NOT NULL
            GROUP BY prompt_version_id,NULLIF(TRIM(provider),''),NULLIF(TRIM(model),'')
            ORDER BY prompt_version_id,answers DESC,provider,model
            """, (rs, n) -> new VersionModelUsage(rs.getLong("prompt_version_id"),
                new ModelUsage(rs.getString("provider"), rs.getString("model"), rs.getLong("answers"))))
            .stream().collect(Collectors.groupingBy(VersionModelUsage::versionId,
                Collectors.mapping(VersionModelUsage::usage, Collectors.toList())));
        return jdbc.query("""
            SELECT p.*,COALESCE(s.answers,0) answers,COALESCE(s.likes,0) likes,
                   COALESCE(s.dislikes,0) dislikes,COALESCE(s.unrated,0) unrated
            FROM chatbot_prompt_versions p LEFT JOIN (
                SELECT a.prompt_version_id,COUNT(*) answers,
                    COUNT(CASE WHEN f.rating='LIKE' THEN 1 END) likes,
                    COUNT(CASE WHEN f.rating='DISLIKE' THEN 1 END) dislikes,
                    COUNT(CASE WHEN f.id IS NULL THEN 1 END) unrated
                FROM chatbot_messages a LEFT JOIN chatbot_feedback f ON f.answer_message_id=a.id
                WHERE a.role='ASSISTANT' AND a.answer_type='AI' GROUP BY a.prompt_version_id
            ) s ON s.prompt_version_id=p.id ORDER BY p.id DESC
            """, (rs, n) -> new Statistics(MAPPER.mapRow(rs, n), rs.getLong("answers"), rs.getLong("likes"),
                rs.getLong("dislikes"), rs.getLong("unrated"), models.getOrDefault(rs.getLong("id"), List.of())));
    }

    public Version create(String version, String content, String description, long actor) {
        var key = new GeneratedKeyHolder();
        try {
            jdbc.update(connection -> {
                var statement = connection.prepareStatement("INSERT INTO chatbot_prompt_versions(version,content,description,created_by) VALUES(?,?,?,?)", Statement.RETURN_GENERATED_KEYS);
                statement.setString(1, version); statement.setString(2, content); statement.setString(3, description); statement.setLong(4, actor);
                return statement;
            }, key);
        } catch (DuplicateKeyException error) {
            throw new ApiException(HttpStatus.CONFLICT, "CHAT_PROMPT_DUPLICATE", "이미 등록된 버전명입니다.");
        }
        return find(Objects.requireNonNull(key.getKey()).longValue());
    }

    public Version activate(long id) {
        return transactions.execute(status -> {
            // Serialize switches across application instances. The unique active_slot also enforces at most one active version.
            var ids = jdbc.queryForList("SELECT id FROM chatbot_prompt_versions ORDER BY id FOR UPDATE", Long.class);
            if (!ids.contains(id)) throw new ApiException(HttpStatus.NOT_FOUND, "CHAT_PROMPT_NOT_FOUND", "프롬프트 버전을 찾을 수 없습니다.");
            if (!find(id).active()) {
                jdbc.update("UPDATE chatbot_prompt_versions SET is_active=FALSE WHERE is_active=TRUE");
                jdbc.update("UPDATE chatbot_prompt_versions SET is_active=TRUE,activated_at=CURRENT_TIMESTAMP(6) WHERE id=?", id);
            }
            return find(id);
        });
    }

    private Version find(long id) {
        return jdbc.query("SELECT * FROM chatbot_prompt_versions WHERE id=?", MAPPER, id).stream().findFirst()
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CHAT_PROMPT_NOT_FOUND", "프롬프트 버전을 찾을 수 없습니다."));
    }
}
