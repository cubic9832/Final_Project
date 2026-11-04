package com.kh.back.admin.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kh.back.admin.dto.ModelTrafficRequest.Allocation;
import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.common.exception.ApiException;
import com.kh.back.recommendation.RecommendationTrafficMapper;
import com.kh.back.recommendation.RecommendationUpstreamRegistry;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

// 모델 관리: 트래픽 비율 저장 — 합 100, 켜진 서버 · 화면과 맞는 모델에만 비율, 운영 로그
class AdminModelTrafficServiceTests {

    private final RecommendationTrafficMapper trafficMapper = mock(RecommendationTrafficMapper.class);
    private final RecommendationUpstreamRegistry registry = mock(RecommendationUpstreamRegistry.class);
    private final AdminAuditLogMapper auditLogMapper = mock(AdminAuditLogMapper.class);
    private final AdminModelTrafficService service = new AdminModelTrafficServiceImpl(trafficMapper, registry, auditLogMapper);

    @BeforeEach
    void setUp() {
        when(registry.refresh()).thenReturn(List.of(
                new Upstream("http://127.0.0.1:8002", true, "model-a", "ui-scenario-height-ranker-v2", true, 281, 80),
                new Upstream("http://127.0.0.1:8003", true, "model-b", "ui-scenario-ranker-v1", true, 281, 80),
                new Upstream("http://127.0.0.1:8004", true, "model-old", "candidate-preferences-v3", false, 281, 80),
                new Upstream("http://127.0.0.1:8005", false, null, null, false, null, null)));
    }

    @Test
    void 비율을_바꾸면_전체를_교체하고_운영_로그에_남긴다() {
        service.updateAllocations(3L, List.of(new Allocation("model-a", 70), new Allocation("model-b", 30),
                new Allocation("model-old", 0)));

        InOrder order = inOrder(trafficMapper, auditLogMapper);
        order.verify(trafficMapper).deleteAllocations();
        order.verify(trafficMapper).insertAllocation("model-a", 70, 3L);
        order.verify(trafficMapper).insertAllocation("model-b", 30, 3L);
        order.verify(auditLogMapper).insert(3L, "MODEL_TRAFFIC_CHANGE", "MODEL", null, "트래픽 비율: model-a 70% · model-b 30%");
        verify(trafficMapper, never()).insertAllocation("model-old", 0, 3L); // 0% 는 저장하지 않는다
    }

    @Test
    void 비율_합이_100이_아니면_거절한다() {
        assertRejected(List.of(new Allocation("model-a", 70), new Allocation("model-b", 20)), "TRAFFIC_TOTAL_INVALID");
        assertRejected(List.of(new Allocation("model-a", 70), new Allocation("model-b", 40)), "TRAFFIC_TOTAL_INVALID");
    }

    @Test
    void 같은_모델을_두_번_넣으면_거절한다() {
        assertRejected(List.of(new Allocation("model-a", 50), new Allocation("model-a", 50)), "TRAFFIC_DUPLICATE_MODEL");
    }

    @Test
    void 켜진_추천_서버가_쓰지_않는_모델에는_비율을_줄_수_없다() {
        assertRejected(List.of(new Allocation("model-a", 50), new Allocation("model-offline", 50)), "MODEL_NOT_SERVING");
    }

    @Test
    void 화면_입력과_맞지_않는_모델에는_비율을_줄_수_없다() {
        assertRejected(List.of(new Allocation("model-a", 50), new Allocation("model-old", 50)), "MODEL_INCOMPATIBLE");
    }

    private void assertRejected(List<Allocation> allocations, String code) {
        assertThatThrownBy(() -> service.updateAllocations(3L, allocations))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", code);
        verify(trafficMapper, never()).deleteAllocations();
        verify(trafficMapper, never()).insertAllocation(anyString(), anyInt(), anyLong());
        verify(auditLogMapper, never()).insert(any(), any(), any(), any(), any());
    }
}
