package com.kh.back.member.recommendation;

import com.kh.back.common.jwt.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecommendationInputsFlowTests {
    private static final String PATH = "/api/v1/members/me/recommendation-inputs";
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired JwtProvider jwt;
    @Autowired PasswordEncoder passwords;
    long owner;
    long other;

    @BeforeEach
    void members() {
        owner = member("recommendation-owner@example.test");
        other = member("recommendation-other@example.test");
    }
    long member(String email) {
        jdbc.update("INSERT INTO users(email,password_hash,nick_name,role) VALUES(?,?,?,'USER')", email, passwords.encode("Remember123!"), email);
        return jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, email);
    }
    String token(long id) { return "Bearer " + jwt.createAccessToken(id, "USER"); }

    @Test
    void savesRestoresPreservesOtherAreaAndIsolatesAccounts() throws Exception {
        mvc.perform(get(PATH).header("Authorization", token(owner))).andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(patch(PATH).header("Authorization", token(owner)).contentType("application/json").content("""
            {"version":0,"financialInputs":{"values":{"income":"300.50","monthlyExpenses":"0"},"assets":{"deposit":""},"loanDetails":[{"payment":"1.2345"}]}}
            """)).andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(1));
        mvc.perform(patch(PATH).header("Authorization", token(owner)).contentType("application/json").content("""
            {"version":1,"vehiclePreferences":{"fuel":"전기","exteriorAngularity":null}}
            """)).andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(2))
                .andExpect(jsonPath("$.data.financialInputs.values.income").value("300.50"));
        mvc.perform(get(PATH).header("Authorization", token(owner))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vehiclePreferences.fuel").value("전기"))
                .andExpect(jsonPath("$.data.financialInputs.assets.deposit").value(""));
        mvc.perform(get(PATH).header("Authorization", token(other))).andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(patch(PATH).header("Authorization", token(owner)).contentType("application/json").content("{\"version\":1,\"vehiclePreferences\":{\"fuel\":\"디젤\"}}"))
                .andExpect(status().isConflict()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(patch(PATH).header("Authorization", token(other)).contentType("application/json").content("{\"version\":0,\"financialInputs\":{\"values\":{\"income\":\"-1\"}}}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized());
    }

    @Test
    void withdrawalDeletesRememberedInputs() throws Exception {
        mvc.perform(patch(PATH).header("Authorization", token(owner)).contentType("application/json").content("{\"version\":0,\"vehiclePreferences\":{\"fuel\":\"전기\"}}"))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/v1/members/me").header("Authorization", token(owner)).contentType("application/json").content("{\"password\":\"Remember123!\"}"))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_recommendation_inputs WHERE user_id=?", Long.class, owner)).isZero();
        mvc.perform(get(PATH).header("Authorization", token(owner))).andExpect(status().isUnauthorized());
    }
}
