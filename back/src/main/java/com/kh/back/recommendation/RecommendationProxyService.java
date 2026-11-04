package com.kh.back.recommendation;

import com.kh.back.recommendation.RecommendationTrafficRouter.Allocation;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 화면의 추천 요청을 비율(트래픽 분배)에 따라 고른 추천 서버로 그대로 넘기고, 응답도 그대로 돌려준다.
 * 응답 헤더 X-Model-Bundle 에 이 요청을 처리한 모델 이름을 실어 준다.
 */
@Slf4j
@Service
public class RecommendationProxyService {

    public static final String MODEL_BUNDLE_HEADER = "X-Model-Bundle";

    private final RecommendationUpstreamRegistry registry;
    private final RecommendationTrafficMapper trafficMapper;
    private final RestClient forwardClient;

    public RecommendationProxyService(RecommendationUpstreamRegistry registry, RecommendationTrafficMapper trafficMapper) {
        this.registry = registry;
        this.trafficMapper = trafficMapper;
        // 추천 계산은 몇 초 걸릴 수 있어 응답 대기는 넉넉히 (화면 요청 제한 10초보다 길게 두지 않는다)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(9));
        this.forwardClient = RestClient.builder().requestFactory(factory).build();
    }

    // 이 사용자가 받을 추천 서버. 켜진 서버가 없으면 빈 값
    public Optional<Upstream> choose(String subjectKey) {
        List<Upstream> alive = registry.upstreams().stream().filter(Upstream::up).toList();
        List<Allocation> allocations = trafficMapper.findAllocations().stream()
                .map(row -> new Allocation(row.getModelBundle(), row.getWeightPercent()))
                .toList();
        return RecommendationTrafficRouter.route(subjectKey, allocations, alive.stream().map(Upstream::modelBundle).toList())
                .flatMap(bundle -> alive.stream().filter(u -> bundle.equals(u.modelBundle())).findFirst());
    }

    /**
     * @param path        추천 서버 경로 (/api/v2/...)
     * @param body        POST 본문 (GET 이면 null)
     * @param countUsage  성공하면 모델별 요청 수에 더할지
     */
    public ResponseEntity<?> forward(String subjectKey, HttpMethod method, String path, byte[] body, boolean countUsage) {
        Optional<Upstream> chosen = choose(subjectKey);
        if (chosen.isEmpty()) {
            return unavailable();
        }
        Upstream upstream = chosen.get();
        try {
            RestClient.RequestBodySpec request = forwardClient.method(method).uri(upstream.baseUrl() + path);
            if (body != null) {
                request.contentType(MediaType.APPLICATION_JSON).body(body);
            }
            ResponseEntity<byte[]> response = request.exchange((req, res) -> {
                MediaType contentType = res.getHeaders().getContentType();
                return ResponseEntity.status(res.getStatusCode())
                        .contentType(contentType == null ? MediaType.APPLICATION_JSON : contentType)
                        .header(MODEL_BUNDLE_HEADER, upstream.modelBundle())
                        .body(res.getBody().readAllBytes());
            });
            if (countUsage && response.getStatusCode().is2xxSuccessful()) {
                trafficMapper.incrementUsage(upstream.modelBundle());
            }
            return response;
        } catch (RestClientException e) {
            // 방금 꺼진 서버 → 다음 요청은 다른 서버로 가도록 상태를 바로 다시 확인한다
            log.warn("recommendation upstream {} failed: {}", upstream.baseUrl(), e.getMessage());
            registry.refresh();
            return unavailable();
        }
    }

    // 추천 서버 응답과 같은 Problem Details 모양 (화면은 detail 을 보여 준다)
    private static ResponseEntity<ProblemDetail> unavailable() {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,
                "분석 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        problem.setTitle("추천 서버 연결 실패");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem);
    }
}
