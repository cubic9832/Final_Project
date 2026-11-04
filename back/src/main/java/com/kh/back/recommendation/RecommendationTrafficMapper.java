package com.kh.back.recommendation;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

// 모델별 트래픽 비율 · 하루 추천 요청 수 (V32)
@Mapper
public interface RecommendationTrafficMapper {

    List<TrafficRow> findAllocations();

    void deleteAllocations();

    void insertAllocation(@Param("modelBundle") String modelBundle, @Param("weightPercent") int weightPercent,
                          @Param("updatedBy") Long updatedBy);

    // 오늘 이 모델의 추천 요청 수 +1 (처음이면 1로 만든다)
    void incrementUsage(@Param("modelBundle") String modelBundle);

    // 오늘 포함 최근 days 일 동안 모델별 추천 요청 수
    List<UsageRow> sumUsage(@Param("days") int days);
}
