package com.kh.back.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kh.back.common.jwt.JwtProvider;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

// 보완 15 (11-03 회의): 탈퇴해도 회원 줄 · 상담 기록은 남고, 같은 이메일로 다시 가입하면 새 회원
// @Transactional: 테스트가 끝나면 넣은 회원 · 상담을 모두 되돌린다 (로컬 DB 에 남지 않음)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MemberWithdrawFlowTests {

    private static final String EMAIL = "withdraw-flow@example.test";
    private static final String PASSWORD = "FlowTest123!"; // 이 테스트 안에서만 쓰는 값

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwordEncoder;

    Long memberId;

    @BeforeEach
    void setUp() {
        jdbc.update("INSERT INTO users (email, password_hash, nick_name, role) VALUES (?, ?, '탈퇴흐름회원', 'USER')",
                EMAIL, passwordEncoder.encode(PASSWORD));
        memberId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, EMAIL);
        jdbc.update("INSERT INTO user_profiles (user_id, birth_date, gender) VALUES (?, '2000-01-01', 'MALE')", memberId);
    }

    private String bearer() {
        return "Bearer " + jwtProvider.createAccessToken(memberId, "USER");
    }

    @Test
    void 탈퇴하면_회원줄과_상담기록은_남고_개인정보는_지워진다() throws Exception {
        // 탈퇴 전에 1:1 상담을 시작해 둔다 (대기 중)
        mvc.perform(post("/api/v1/chat/me").header("Authorization", bearer())).andExpect(status().isOk());

        mvc.perform(delete("/api/v1/members/me").header("Authorization", bearer())
                        .contentType("application/json").content("{\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk());

        // 회원 줄은 남고 "탈퇴 회원" 으로 바뀐다 — 이메일 · 닉네임은 알아볼 수 없는 값
        Map<String, Object> user = jdbc.queryForMap("SELECT email, nick_name, role FROM users WHERE id = ?", memberId);
        assertThat(user.get("role")).isEqualTo("WITHDRAWN");
        assertThat(user.get("email")).isEqualTo("withdrawn-" + memberId + "@deleted.invalid");
        assertThat((String) user.get("nick_name")).startsWith("[탈퇴한 회원]");
        // 생년월일 · 성별은 지워진다
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_profiles WHERE user_id = ?", Integer.class, memberId)).isZero();
        // 상담 기록은 남고 종료된다
        assertThat(jdbc.queryForObject("SELECT status FROM chat_room WHERE user_id = ?", String.class, memberId)).isEqualTo("CLOSED");

        // 탈퇴 순간 남은 access token 으로는 내 정보 · 상담 모두 "없는 회원"
        mvc.perform(get("/api/v1/members/me").header("Authorization", bearer()))
                .andExpect(jsonPath("$.error.code").value("MEMBER_NOT_FOUND"));
        mvc.perform(post("/api/v1/chat/me").header("Authorization", bearer()))
                .andExpect(jsonPath("$.error.code").value("MEMBER_NOT_FOUND"));
        // 예전 이메일 · 비밀번호로는 로그인되지 않는다
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
                        .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized());

        // 같은 이메일로 다시 가입할 수 있다 → 새 번호의 새 회원 (예전 상담 기록과 연결 안 됨)
        jdbc.update("INSERT INTO users (email, password_hash, nick_name, role) VALUES (?, 'x', '재가입회원', 'USER')", EMAIL);
        Long newId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, EMAIL);
        assertThat(newId).isNotEqualTo(memberId);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM chat_room WHERE user_id = ?", Integer.class, newId)).isZero();
    }
}
