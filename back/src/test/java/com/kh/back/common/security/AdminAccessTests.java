package com.kh.back.common.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.mockito.Mockito.when;

import com.kh.back.common.jwt.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// 7단계: /api/v1/admin/** 는 관리자 · 총관리자만. 없는 주소로 확인하면 관리자는 보안을 통과해 404, 비회원 401
// 보완 11: 일반 회원도 403 대신 404 — 없는 주소와 똑같이 보여 관리자 기능이 있는지 모르게
// 관리자 API 는 DB 의 지금 권한을 다시 보므로(CurrentRoleLookup), 테스트에서는 회원 번호별 권한을 정해 둔다
// 1번 = 관리자, 2번 = 일반 회원, 3번 = 총관리자, 4번 = 토큰은 관리자지만 DB 에서는 해제된 회원
@SpringBootTest
@AutoConfigureMockMvc
class AdminAccessTests {

    private static final String ADMIN_URL = "/api/v1/admin/access-check";

    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwtProvider;
    @MockitoBean CurrentRoleLookup currentRoleLookup;
    @MockitoBean com.kh.back.recommendation.RecommendationUpstreamRegistry runtimeCatalog;
    @MockitoBean com.kh.back.admin.repository.AdminPermissionRepository permissions;

    @BeforeEach
    void setUp() {
        when(permissions.allowedScreens(1L)).thenReturn(java.util.List.of("OVERVIEW","VEHICLES","RECOMMENDATIONS","MODELS","MEMBERS","CHAT","CHATBOT","LOGS"));
        when(currentRoleLookup.currentRole(1L)).thenReturn("ADMIN");
        when(currentRoleLookup.currentRole(2L)).thenReturn("USER");
        when(currentRoleLookup.currentRole(3L)).thenReturn("SUPER_ADMIN");
        when(currentRoleLookup.currentRole(4L)).thenReturn("USER");
    }

    @Test
    void 화면_권한이_정의되지_않은_관리자_주소는_거부한다() throws Exception {
        String token = jwtProvider.createAccessToken(1L, "ADMIN");
        mvc.perform(get(ADMIN_URL).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void 일반_회원에게는_없는_주소처럼_404() throws Exception {
        String token = jwtProvider.createAccessToken(2L, "USER");
        mvc.perform(get(ADMIN_URL).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void 비회원은_401() throws Exception {
        mvc.perform(get(ADMIN_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 관리자는_회원_현황을_볼_수_있다() throws Exception {
        String token = jwtProvider.createAccessToken(1L, "ADMIN");
        mvc.perform(get("/api/v1/admin/members/summary").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.daily.length()").value(7))
                .andExpect(jsonPath("$.data.ageBands[5].label").value("미입력"));
        mvc.perform(get("/api/v1/admin/members?size=5").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.size").value(5));
    }

    // 운영 현황(할 일 · 재무 진단 이용 현황): 관리자 200 (7일 막대 7칸), 일반 회원 404
    @Test
    void 관리자는_운영_현황을_볼_수_있다() throws Exception {
        mvc.perform(get("/api/v1/admin/overview")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.diagnoses.daily.length()").value(7))
                .andExpect(jsonPath("$.data.profileMissing").isNumber());
        mvc.perform(get("/api/v1/admin/overview")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(2L, "USER")))
                .andExpect(status().isNotFound());
    }

    // 모델 관리: git 에 있는 학습 결과 파일(ml/outputs/...)을 읽는다, 일반 회원 404
    // 기본 폴더 = 추천 서버와 같은 scenario-choices (새 형식: 이전 모델 비교 지표 없음, 에포크 기록 있음)
    @Test
    void 관리자는_모델_학습_결과를_볼_수_있다() throws Exception {
        mvc.perform(get("/api/v1/admin/model-report")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true))
                .andExpect(jsonPath("$.data.runName").value("20261104-specifications-completed"))
                .andExpect(jsonPath("$.data.history.length()").value(30))
                .andExpect(jsonPath("$.data.testPairAccuracy").isNumber());
        mvc.perform(get("/api/v1/admin/model-report")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(2L, "USER")))
                .andExpect(status().isNotFound());
    }

    // 추천 관리: 추천 서버가 쓰는 후보 차량 목록(catalog.json), 일반 회원 404
    @Test
    void 관리자는_추천_후보_차량을_볼_수_있다() throws Exception {
        var upstream = new com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream("http://runtime.test", true, "test", "test", true, 1, 1);
        when(runtimeCatalog.upstreams()).thenReturn(java.util.List.of(upstream));
        when(runtimeCatalog.candidates(upstream)).thenReturn(tools.jackson.databind.json.JsonMapper.builder().build().readTree("[{\"id\":\"runtime-car\",\"brand\":\"실행 후보\",\"price\":23980000}]"));
        mvc.perform(get("/api/v1/admin/recommendation-candidates")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].brand").isNotEmpty())
                .andExpect(jsonPath("$.data[0].price").isNumber());
        mvc.perform(get("/api/v1/admin/recommendation-candidates")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(2L, "USER")))
                .andExpect(status().isNotFound());
    }

    // 서비스 연결 상태: 관리자는 실제 DB 확인 결과, 일반 회원 404
    @Test
    void 관리자는_서비스_연결_상태를_볼_수_있다() throws Exception {
        mvc.perform(get("/api/v1/admin/system-status")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.databaseUp").value(true))
                .andExpect(jsonPath("$.data.databaseVersion").isNotEmpty());
        mvc.perform(get("/api/v1/admin/system-status")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(2L, "USER")))
                .andExpect(status().isNotFound());
    }

    // 권한 바꾸기는 총관리자만: 일반 관리자 403, 총관리자는 보안을 통과해 서비스까지 간다 (없는 회원이라 404)
    @Test
    void 권한_바꾸기는_총관리자만() throws Exception {
        String body = "{\"role\":\"ADMIN\"}";
        mvc.perform(patch("/api/v1/admin/members/999999/role").contentType("application/json").content(body)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/admin/members/999999/role").contentType("application/json").content(body)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(3L, "SUPER_ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("TARGET_MEMBER_NOT_FOUND"));
    }

    // 모델 관리: 비교 표는 관리자 200, 트래픽 비율 바꾸기는 총관리자만 (관리자 403, 총관리자는 서비스까지 가서 합계 검사 400)
    @Test
    void 모델_비교는_관리자_트래픽_비율_바꾸기는_총관리자만() throws Exception {
        mvc.perform(get("/api/v1/admin/models")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.models").isArray())
                .andExpect(jsonPath("$.data.upstreams").isArray());
        String body = "{\"allocations\":[{\"modelBundle\":\"model-a\",\"weightPercent\":50}]}";
        mvc.perform(put("/api/v1/admin/model-traffic").contentType("application/json").content(body)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/model-traffic").contentType("application/json").content(body)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(3L, "SUPER_ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("TRAFFIC_TOTAL_INVALID"));
    }

    // 추천 서버 켜기 · 끄기는 총관리자만: 관리자 403, 총관리자는 서비스까지 가서 없는 모델 404 · 켜는 포트가 아니면 400
    @Test
    void 추천_서버_켜기_끄기는_총관리자만() throws Exception {
        String body = "{\"runId\":\"scenario-choices/no-such-model\"}";
        mvc.perform(post("/api/v1/admin/model-servers").contentType("application/json").content(body)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/admin/model-servers/8003")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/model-servers").contentType("application/json").content(body)
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(3L, "SUPER_ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("MODEL_RUN_NOT_FOUND"));
        mvc.perform(delete("/api/v1/admin/model-servers/8002")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(3L, "SUPER_ADMIN")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("SERVER_NOT_MANAGED"));
    }

    // 재무 진단 추천은 비회원도 받는다: 로그인 없이 보안을 통과한다 (추천 서버가 켜져 있으면 200, 꺼져 있으면 503)
    @Test
    void 추천_요청은_비회원도_보안을_통과한다() throws Exception {
        int status = mvc.perform(get("/api/v1/recommendation/options").header("X-Visitor-Id", "test-visitor-0001"))
                .andReturn().getResponse().getStatus();
        assertThat(status).isIn(200, 503);
    }

    @Test
    void 총관리자도_관리자_화면_API를_쓴다() throws Exception {
        mvc.perform(get("/api/v1/admin/members/summary")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(3L, "SUPER_ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void 관리자는_운영_로그를_볼_수_있다() throws Exception {
        mvc.perform(get("/api/v1/admin/audit-logs?size=3")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(1L, "ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.size").value(3));
    }

    // 해제된 관리자: 토큰에는 아직 ADMIN 이 남아 있어도(최대 30분) DB 가 USER 면 바로 막힌다 (보완 11: 404)
    @Test
    void 관리자를_해제하면_토큰이_남아_있어도_바로_막힌다() throws Exception {
        mvc.perform(get("/api/v1/admin/members/summary")
                        .header("Authorization", "Bearer " + jwtProvider.createAccessToken(4L, "ADMIN")))
                .andExpect(status().isNotFound());
    }
}
