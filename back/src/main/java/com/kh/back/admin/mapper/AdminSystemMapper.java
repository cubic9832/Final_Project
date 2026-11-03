package com.kh.back.admin.mapper;

import java.time.LocalDateTime;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

// 7단계: 서비스 연결 상태 확인용 SQL (읽기만)
@Mapper
public interface AdminSystemMapper {

    // DB 가 응답하는지 (항상 1)
    int ping();

    // 마지막으로 성공한 Flyway 마이그레이션 번호
    String findLatestMigration();

    // 보완 13: 메일 발송 기록 (운영 로그 표 admin_audit_logs 의 MAIL_SENT · MAIL_FAILED)
    int countMailSince(@Param("success") boolean success);

    LocalDateTime findLastMailFailedAt();

    String findLastMailFailedReason();
}
