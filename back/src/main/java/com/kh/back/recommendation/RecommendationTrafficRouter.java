package com.kh.back.recommendation;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * 사용자 한 명을 어느 추천 모델로 보낼지 정한다 (트래픽 분배). 외부 연결 없는 계산만.
 *
 * 사용자 키(회원 번호 · 비회원 익명 ID)를 해시해 0 ~ (비율 합 - 1) 칸 중 하나를 고르고,
 * 모델 이름순으로 비율만큼 칸을 이어 붙인 구간에서 그 칸이 속한 모델을 고른다.
 * → 비율을 바꾸지 않는 한 같은 사용자는 같은 모델, 비율을 조금 바꾸면 경계 근처 사용자만 옮겨 간다.
 *
 * 배정된 모델의 서버가 꺼져 있으면: 켜진 서버 중 비율이 가장 큰 모델 → 그것도 없으면 켜진 서버 중 첫 번째(설정 순서).
 */
public final class RecommendationTrafficRouter {

    public record Allocation(String modelBundle, int weightPercent) {
    }

    private RecommendationTrafficRouter() {
    }

    /**
     * @param subjectKey  사용자 키 (예: member:12, visitor:uuid)
     * @param allocations 저장된 비율
     * @param aliveBundles 지금 응답하는 추천 서버의 모델 이름 (설정 순서)
     * @return 보낼 모델 이름. 켜진 서버가 하나도 없으면 빈 값
     */
    public static Optional<String> route(String subjectKey, List<Allocation> allocations, List<String> aliveBundles) {
        if (aliveBundles.isEmpty()) {
            return Optional.empty();
        }
        List<Allocation> weighted = allocations.stream()
                .filter(allocation -> allocation.weightPercent() > 0)
                .sorted(Comparator.comparing(Allocation::modelBundle))
                .toList();
        int total = weighted.stream().mapToInt(Allocation::weightPercent).sum();
        if (total > 0) {
            int bucket = Math.floorMod(hash(subjectKey), total);
            for (Allocation allocation : weighted) {
                bucket -= allocation.weightPercent();
                if (bucket < 0) {
                    if (aliveBundles.contains(allocation.modelBundle())) {
                        return Optional.of(allocation.modelBundle());
                    }
                    break;
                }
            }
            Optional<String> heaviestAlive = weighted.stream()
                    .filter(allocation -> aliveBundles.contains(allocation.modelBundle()))
                    .max(Comparator.comparingInt(Allocation::weightPercent)
                            .thenComparing(Allocation::modelBundle, Comparator.reverseOrder()))
                    .map(Allocation::modelBundle);
            if (heaviestAlive.isPresent()) {
                return heaviestAlive;
            }
        }
        return Optional.of(aliveBundles.get(0));
    }

    // String.hashCode 는 비슷한 키(visitor:...1, ...2)끼리 칸이 몰릴 수 있어 SHA-256 앞 4바이트를 쓴다
    static int hash(String subjectKey) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(subjectKey.getBytes(StandardCharsets.UTF_8));
            return ((digest[0] & 0xff) << 24) | ((digest[1] & 0xff) << 16) | ((digest[2] & 0xff) << 8) | (digest[3] & 0xff);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
