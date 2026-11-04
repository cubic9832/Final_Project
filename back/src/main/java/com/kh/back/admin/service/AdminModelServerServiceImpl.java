package com.kh.back.admin.service;

import com.kh.back.admin.dto.ModelServerResponse;
import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.common.exception.ApiException;
import com.kh.back.recommendation.RecommendationServerLauncher;
import com.kh.back.recommendation.RecommendationServerLauncher.Server;
import com.kh.back.recommendation.RecommendationTrafficMapper;
import com.kh.back.recommendation.RecommendationUpstreamRegistry;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class AdminModelServerServiceImpl implements AdminModelServerService {

    static final String START_ACTION = "MODEL_SERVER_START";
    static final String STOP_ACTION = "MODEL_SERVER_STOP";

    private final ModelRunLocator locator;
    private final RecommendationServerLauncher launcher;
    private final RecommendationUpstreamRegistry registry;
    private final RecommendationTrafficMapper trafficMapper;
    private final AdminAuditLogMapper adminAuditLogMapper;
    private final ObjectMapper objectMapper;

    // 화면 입력과 맞는 모델만 · 이미 켜진 모델은 다시 켜지 않는다
    @Override
    public ModelServerResponse start(Long actorId, String runId) {
        Path dir = locator.resolve(runId);
        String runName = dir.getFileName().toString();
        if (!AdminModelServiceImpl.SCENARIO_SCHEMAS.contains(schema(dir))) {
            throw new ApiException(HttpStatus.CONFLICT, "MODEL_INCOMPATIBLE",
                    runName + " 모델은 지금 화면의 입력 항목과 맞지 않아 켤 수 없습니다.");
        }
        if (registry.refresh().stream().anyMatch(u -> u.up() && runName.equals(u.modelBundle()))) {
            throw new ApiException(HttpStatus.CONFLICT, "MODEL_ALREADY_SERVING", runName + " 모델은 이미 켜져 있습니다.");
        }
        Server server = launcher.start(dir, locator.mlDir());
        adminAuditLogMapper.insert(actorId, START_ACTION, "MODEL", null, "추천 서버 켜기: " + runName + " (포트 " + server.port() + ")");
        return new ModelServerResponse(server.port(), server.runName(), server.state().name());
    }

    // 비율이 남은 모델은 먼저 0%로 저장해야 끈다 (사용자가 모르는 사이 다른 모델로 옮겨 가지 않게)
    @Override
    public void stop(Long actorId, int port) {
        launcher.requireStoppable(port);
        String runName = launcher.servedOn(port).orElse(null);
        if (runName != null && trafficMapper.findAllocations().stream()
                .anyMatch(row -> runName.equals(row.getModelBundle()) && row.getWeightPercent() > 0)) {
            throw new ApiException(HttpStatus.CONFLICT, "MODEL_HAS_TRAFFIC",
                    runName + " 모델에 트래픽 비율이 남아 있습니다. 비율을 0%로 저장한 뒤 꺼 주세요.");
        }
        String stopped = launcher.stop(port);
        adminAuditLogMapper.insert(actorId, STOP_ACTION, "MODEL", null,
                "추천 서버 끄기: " + (stopped == null ? "알 수 없는 모델" : stopped) + " (포트 " + port + ")");
    }

    private String schema(Path dir) {
        try {
            return objectMapper.readTree(Files.readString(dir.resolve("metadata.json"))).path("schema").asString(null);
        } catch (Exception e) {
            return null;
        }
    }
}
