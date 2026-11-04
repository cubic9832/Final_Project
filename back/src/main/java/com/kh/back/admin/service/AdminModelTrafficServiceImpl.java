package com.kh.back.admin.service;

import com.kh.back.admin.dto.ModelTrafficRequest.Allocation;
import com.kh.back.admin.mapper.AdminAuditLogMapper;
import com.kh.back.common.exception.ApiException;
import com.kh.back.recommendation.RecommendationTrafficMapper;
import com.kh.back.recommendation.RecommendationUpstreamRegistry;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminModelTrafficServiceImpl implements AdminModelTrafficService {

    static final String AUDIT_ACTION = "MODEL_TRAFFIC_CHANGE";

    private final RecommendationTrafficMapper trafficMapper;
    private final RecommendationUpstreamRegistry registry;
    private final AdminAuditLogMapper adminAuditLogMapper;

    // 비율 합 100 · 같은 모델 두 번 금지 · 비율을 주는 모델은 지금 켜진 추천 서버가 쓰고 있고 화면 입력과 맞아야 한다
    @Override
    @Transactional
    public void updateAllocations(Long actorId, List<Allocation> allocations) {
        Set<String> seen = new HashSet<>();
        for (Allocation allocation : allocations) {
            if (!seen.add(allocation.modelBundle())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "TRAFFIC_DUPLICATE_MODEL", "같은 모델을 두 번 넣을 수 없습니다.");
            }
        }
        int total = allocations.stream().mapToInt(Allocation::weightPercent).sum();
        if (total != 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "TRAFFIC_TOTAL_INVALID",
                    "비율 합이 100%가 되어야 합니다. (지금 " + total + "%)");
        }
        List<Upstream> upstreams = registry.refresh(); // 방금 켜고 끈 서버도 바로 반영
        List<Allocation> weighted = allocations.stream().filter(a -> a.weightPercent() > 0).toList();
        for (Allocation allocation : weighted) {
            Upstream upstream = upstreams.stream()
                    .filter(u -> u.up() && allocation.modelBundle().equals(u.modelBundle()))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "MODEL_NOT_SERVING",
                            allocation.modelBundle() + " 모델을 쓰는 추천 서버가 켜져 있지 않습니다."));
            if (!upstream.scenarioSupported()) {
                throw new ApiException(HttpStatus.CONFLICT, "MODEL_INCOMPATIBLE",
                        allocation.modelBundle() + " 모델은 지금 화면의 입력 항목과 맞지 않아 비율을 줄 수 없습니다.");
            }
        }

        trafficMapper.deleteAllocations();
        for (Allocation allocation : weighted) {
            trafficMapper.insertAllocation(allocation.modelBundle(), allocation.weightPercent(), actorId);
        }
        String detail = weighted.stream()
                .map(a -> a.modelBundle() + " " + a.weightPercent() + "%")
                .collect(Collectors.joining(" · "));
        adminAuditLogMapper.insert(actorId, AUDIT_ACTION, "MODEL", null, truncate("트래픽 비율: " + detail, 255));
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }
}
