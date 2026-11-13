package com.kh.back.diagnosis.service;

import com.kh.back.diagnosis.dto.DiagnosisSaveRequest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class DiagnosisIdempotencyTests {
    @Autowired DiagnosisService service;
    @Autowired JdbcTemplate jdbc;

    @Test void repeatedRequestReturnsOnePersistentDiagnosis() {
        long memberId = 999997;
        jdbc.update("INSERT INTO users(id,email,password_hash,nick_name,role) VALUES(?,?,?,?,'USER')", memberId,
            "diagnosis-request-test@example.test", "test-only", "진단 재시도 테스트");
        var request = new DiagnosisSaveRequest();
        request.setRequestId(UUID.randomUUID().toString());
        request.setModelVersion("idempotency-test");
        request.setMonthlyIncome(3000000L); request.setMonthlyExpense(1000000L);
        request.setMonthlyAvailable(2000000L); request.setPurchaseFunds(30000000L);
        var first = service.save(memberId, request);
        var second = service.save(memberId, request);
        assertThat(second.getAnalysisId()).isEqualTo(first.getAnalysisId());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM input_snapshots WHERE user_id=? AND diagnosis_request_id=?",
            Integer.class, memberId, request.getRequestId())).isEqualTo(1);
    }
}
