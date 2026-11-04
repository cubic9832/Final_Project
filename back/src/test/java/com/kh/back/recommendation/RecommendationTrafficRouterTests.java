package com.kh.back.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.kh.back.recommendation.RecommendationTrafficRouter.Allocation;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

// 모델 관리: 사용자를 비율대로 여러 추천 모델에 나눠 보내기
class RecommendationTrafficRouterTests {

    private static final List<Allocation> SEVENTY_THIRTY = List.of(new Allocation("model-a", 70), new Allocation("model-b", 30));
    private static final List<String> BOTH_ALIVE = List.of("model-a", "model-b");

    @Test
    void 사용자_만명을_70_30_비율대로_나눈다() {
        Map<String, Integer> counts = new HashMap<>();
        for (int i = 0; i < 10_000; i++) {
            String bundle = RecommendationTrafficRouter.route("visitor:" + i, SEVENTY_THIRTY, BOTH_ALIVE).orElseThrow();
            counts.merge(bundle, 1, Integer::sum);
        }
        assertThat(counts.get("model-a")).isBetween(6_700, 7_300);
        assertThat(counts.get("model-b")).isBetween(2_700, 3_300);
    }

    @Test
    void 같은_사용자는_항상_같은_모델을_받는다() {
        Optional<String> first = RecommendationTrafficRouter.route("member:42", SEVENTY_THIRTY, BOTH_ALIVE);
        for (int i = 0; i < 20; i++) {
            assertThat(RecommendationTrafficRouter.route("member:42", SEVENTY_THIRTY, BOTH_ALIVE)).isEqualTo(first);
        }
    }

    @Test
    void 비율을_조금_바꾸면_경계_근처_사용자만_옮겨_간다() {
        List<Allocation> sixtyForty = List.of(new Allocation("model-a", 60), new Allocation("model-b", 40));
        int moved = 0;
        for (int i = 0; i < 10_000; i++) {
            String key = "visitor:" + i;
            if (!RecommendationTrafficRouter.route(key, SEVENTY_THIRTY, BOTH_ALIVE)
                    .equals(RecommendationTrafficRouter.route(key, sixtyForty, BOTH_ALIVE))) {
                moved++;
            }
        }
        assertThat(moved).isBetween(700, 1_300); // 10% 근처만 이동 (전부 다시 섞이지 않는다)
    }

    @Test
    void 비율이_0인_모델에는_보내지_않는다() {
        List<Allocation> allToB = List.of(new Allocation("model-a", 0), new Allocation("model-b", 100));
        for (int i = 0; i < 1_000; i++) {
            assertThat(RecommendationTrafficRouter.route("visitor:" + i, allToB, BOTH_ALIVE)).contains("model-b");
        }
    }

    @Test
    void 배정된_서버가_꺼지면_켜진_서버_중_비율이_큰_모델로_보낸다() {
        List<Allocation> three = List.of(new Allocation("model-a", 50), new Allocation("model-b", 30), new Allocation("model-c", 20));
        List<String> withoutA = List.of("model-c", "model-b");
        for (int i = 0; i < 1_000; i++) {
            String key = "visitor:" + i;
            Optional<String> normal = RecommendationTrafficRouter.route(key, three, List.of("model-a", "model-b", "model-c"));
            Optional<String> fallback = RecommendationTrafficRouter.route(key, three, withoutA);
            if (normal.equals(Optional.of("model-a"))) {
                assertThat(fallback).contains("model-b");
            } else {
                assertThat(fallback).isEqualTo(normal);
            }
        }
    }

    @Test
    void 비율을_정하지_않았거나_비율_모델이_모두_꺼지면_첫_번째_서버로_보낸다() {
        assertThat(RecommendationTrafficRouter.route("visitor:1", List.of(), List.of("model-x", "model-y"))).contains("model-x");
        assertThat(RecommendationTrafficRouter.route("visitor:1", SEVENTY_THIRTY, List.of("model-x"))).contains("model-x");
    }

    @Test
    void 켜진_서버가_없으면_빈_값() {
        assertThat(RecommendationTrafficRouter.route("visitor:1", SEVENTY_THIRTY, List.of())).isEmpty();
    }
}
