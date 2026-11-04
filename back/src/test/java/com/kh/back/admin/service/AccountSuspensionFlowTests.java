package com.kh.back.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kh.back.common.jwt.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

// 9단계: 계정 정지를 실제 주소 · DB 로 처음부터 끝까지 확인
//   총관리자가 정지 → 로그인 403 · 상담 시작 403 · 진행 중이던 상담은 종료 → 정지 풀기 → 로그인 200
// @Transactional: 테스트가 끝나면 넣은 회원 · 상담 · 운영 로그를 모두 되돌린다 (로컬 DB 에 남지 않음)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AccountSuspensionFlowTests {

    private static final String PASSWORD = "FlowTest123!"; // 이 테스트 안에서만 쓰는 값

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwordEncoder;

    Long superAdminId;
    Long memberId;

    @BeforeEach
    void setUp() {
        String hash = passwordEncoder.encode(PASSWORD);
        superAdminId = insertUser("suspend-flow-super@example.test", "정지흐름총관리자", hash);
        jdbc.update("INSERT INTO admin_accounts (user_id, role) VALUES (?, 'SUPER_ADMIN')", superAdminId);
        memberId = insertUser("suspend-flow-member@example.test", "정지흐름회원", hash);
    }

    private Long insertUser(String email, String nickName, String hash) {
        jdbc.update("INSERT INTO users (email, password_hash, nick_name, role) VALUES (?, ?, ?, 'USER')", email, hash, nickName);
        return jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
    }

    private String bearer(Long id, String role) {
        return "Bearer " + jwtProvider.createAccessToken(id, role);
    }

    private ResultActions login() throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType("application/json")
                .content("{\"email\":\"suspend-flow-member@example.test\",\"password\":\"" + PASSWORD + "\"}"));
    }

    @Test
    void 정지하면_로그인과_상담이_막히고_풀면_다시_로그인된다() throws Exception {
        login().andExpect(status().isOk());

        // 정지 전에 상담을 시작해 둔다 (대기 중)
        mvc.perform(post("/api/v1/chat/me").header("Authorization", bearer(memberId, "USER")))
                .andExpect(status().isOk());

        // 총관리자가 7일 정지
        mvc.perform(post("/api/v1/admin/members/" + memberId + "/suspend").contentType("application/json")
                        .content("{\"days\":7,\"reason\":\"흐름 테스트\"}")
                        .header("Authorization", bearer(superAdminId, "SUPER_ADMIN")))
                .andExpect(status().isOk());

        login().andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_SUSPENDED"));
        // 정지 순간 남은 access token 으로도 상담은 시작할 수 없다
        mvc.perform(post("/api/v1/chat/me").header("Authorization", bearer(memberId, "USER")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_SUSPENDED"));
        // 대기 중이던 상담은 종료됐다
        String status = jdbc.queryForObject("SELECT status FROM chat_room WHERE user_id = ?", String.class, memberId);
        assertThat(status).isEqualTo("CLOSED");

        // 정지 풀기 → 다시 로그인
        mvc.perform(post("/api/v1/admin/members/" + memberId + "/unsuspend")
                        .header("Authorization", bearer(superAdminId, "SUPER_ADMIN")))
                .andExpect(status().isOk());
        login().andExpect(status().isOk());
    }
}
