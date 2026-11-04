package com.kh.back.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kh.back.admin.dto.ModelServerResponse;
import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.common.exception.ApiException;
import com.kh.back.recommendation.RecommendationServerLauncher;
import com.kh.back.recommendation.RecommendationServerLauncher.Server;
import com.kh.back.recommendation.RecommendationServerLauncher.State;
import com.kh.back.recommendation.RecommendationTrafficMapper;
import com.kh.back.recommendation.RecommendationUpstreamRegistry;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import com.kh.back.recommendation.TrafficRow;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;

// 모델 관리: 추천 서버 켜기 · 끄기 — 화면과 맞는 모델만, 이미 켠 모델 거절, 비율이 남은 모델은 끄지 않음, 운영 로그
class AdminModelServerServiceTests {

    @TempDir
    Path root;

    private final RecommendationServerLauncher launcher = mock(RecommendationServerLauncher.class);
    private final RecommendationUpstreamRegistry registry = mock(RecommendationUpstreamRegistry.class);
    private final RecommendationTrafficMapper trafficMapper = mock(RecommendationTrafficMapper.class);
    private final AdminAuditLogMapper auditLogMapper = mock(AdminAuditLogMapper.class);
    private AdminModelServerService service;

    @BeforeEach
    void setUp() throws Exception {
        Path models = Files.createDirectories(root.resolve("ml/outputs/models"));
        Files.createDirectories(root.resolve("ml/vehicle_matching"));
        run(models, "scenario-choices/model-new", "ui-scenario-height-ranker-v2");
        run(models, "candidate-preferences/model-old", "candidate-preferences-v3");
        when(registry.refresh()).thenReturn(List.of());
        service = new AdminModelServerServiceImpl(new ModelRunLocator(models.toString()), launcher, registry, trafficMapper,
                auditLogMapper, JsonMapper.builder().build());
    }

    private static void run(Path models, String runId, String schema) throws Exception {
        Path dir = Files.createDirectories(models.resolve(runId));
        Files.writeString(dir.resolve("metadata.json"), "{\"schema\": \"" + schema + "\"}");
        Files.writeString(dir.resolve("training_report.json"), "{}");
    }

    @Test
    void 화면과_맞는_모델을_켜고_운영_로그에_남긴다() {
        when(launcher.start(any(), any())).thenReturn(new Server(8003, "model-new", State.STARTING, null));

        ModelServerResponse response = service.start(3L, "scenario-choices/model-new");

        assertThat(response).isEqualTo(new ModelServerResponse(8003, "model-new", "STARTING"));
        verify(launcher).start(root.resolve("ml/outputs/models/scenario-choices/model-new").toAbsolutePath().normalize(),
                root.resolve("ml").toAbsolutePath().normalize());
        verify(auditLogMapper).insert(3L, "MODEL_SERVER_START", "MODEL", null, "추천 서버 켜기: model-new (포트 8003)");
    }

    @Test
    void 입력_구조가_다르거나_이미_켜진_모델은_켜지_않는다() {
        assertCode(() -> service.start(3L, "candidate-preferences/model-old"), "MODEL_INCOMPATIBLE");
        when(registry.refresh()).thenReturn(List.of(
                new Upstream("http://127.0.0.1:8002", true, "model-new", "ui-scenario-height-ranker-v2", true, 281, 80)));
        assertCode(() -> service.start(3L, "scenario-choices/model-new"), "MODEL_ALREADY_SERVING");
        assertCode(() -> service.start(3L, "scenario-choices/../../../etc"), "MODEL_RUN_NOT_FOUND");
        verify(launcher, never()).start(any(), any());
    }

    @Test
    void 비율이_남은_모델은_끄지_않고_0퍼센트면_끈다() {
        when(launcher.servedOn(8003)).thenReturn(Optional.of("model-new"));
        TrafficRow weight = new TrafficRow();
        weight.setModelBundle("model-new");
        weight.setWeightPercent(30);
        when(trafficMapper.findAllocations()).thenReturn(List.of(weight));

        assertCode(() -> service.stop(3L, 8003), "MODEL_HAS_TRAFFIC");
        verify(launcher, never()).stop(anyInt());

        when(trafficMapper.findAllocations()).thenReturn(List.of());
        when(launcher.stop(8003)).thenReturn("model-new");
        service.stop(3L, 8003);
        verify(auditLogMapper).insert(3L, "MODEL_SERVER_STOP", "MODEL", null, "추천 서버 끄기: model-new (포트 8003)");
    }

    private static void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String code) {
        assertThatThrownBy(call).isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", code);
    }
}
