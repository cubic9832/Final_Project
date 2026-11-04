package com.kh.back.recommendation;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/**
 * 설정한 추천 서버(FastAPI)들과 관리자 화면에서 켠 추천 서버(recommendation.launcher.ports)들이 지금 켜져 있는지, 각각 어떤 모델(학습 결과 폴더)을 쓰는지 확인한다.
 * 추천 서버 하나 = 모델 하나 (ml/serve-candidates.sh 를 PORT · RUN 만 바꿔 여러 번 띄운다).
 * 매 요청마다 묻지 않도록 결과를 잠깐(30초) 기억한다.
 */
@Slf4j
@Component
public class RecommendationUpstreamRegistry {

    private static final Duration CACHE_TTL = Duration.ofSeconds(30);

    /**
     * @param baseUrl           추천 서버 주소 (예: http://127.0.0.1:8002)
     * @param up                지금 응답하는지
     * @param modelBundle       쓰는 모델 (학습 결과 폴더 이름)
     * @param rankerSchema      입력 구조
     * @param scenarioSupported 지금 화면(시나리오 입력)과 맞는 모델인지
     * @param catalogCount      추천 후보 차량 수
     * @param modelNames        후보 차종 수
     */
    public record Upstream(String baseUrl, boolean up, String modelBundle, String rankerSchema,
                           boolean scenarioSupported, Integer catalogCount, Integer modelNames) {
    }

    private final List<String> baseUrls;
    private final List<Integer> poolPorts;
    private final RestClient probeClient;
    private volatile List<Upstream> cached;
    private volatile Instant cachedAt = Instant.EPOCH;

    public RecommendationUpstreamRegistry(@Value("${recommendation.upstreams}") String upstreams,
                                          @Value("${recommendation.launcher.ports}") String poolPorts) {
        this.baseUrls = Arrays.stream(upstreams.split(","))
                .map(String::strip)
                .filter(url -> !url.isEmpty())
                .map(url -> url.endsWith("/") ? url.substring(0, url.length() - 1) : url)
                .distinct()
                .toList();
        this.poolPorts = parsePorts(poolPorts).stream().filter(port -> !baseUrls.contains(poolBaseUrl(port))).toList();
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(1));
        factory.setReadTimeout(Duration.ofSeconds(3));
        this.probeClient = RestClient.builder().requestFactory(factory).build();
    }

    // "8003-8010" 또는 "8003,8005" → 포트 목록 (관리자 화면에서 켜는 추천 서버용)
    public static List<Integer> parsePorts(String spec) {
        List<Integer> ports = new ArrayList<>();
        if (spec == null) {
            return ports;
        }
        for (String part : spec.split(",")) {
            String value = part.strip();
            if (value.isEmpty()) {
                continue;
            }
            int dash = value.indexOf('-');
            int from = Integer.parseInt(dash < 0 ? value : value.substring(0, dash).strip());
            int to = dash < 0 ? from : Integer.parseInt(value.substring(dash + 1).strip());
            for (int port = from; port <= to; port++) {
                if (!ports.contains(port)) {
                    ports.add(port);
                }
            }
        }
        return ports;
    }

    public static String poolBaseUrl(int port) {
        return "http://127.0.0.1:" + port;
    }

    // 관리자 화면에서 켜고 끌 수 있는 포트 (설정한 고정 추천 서버 주소와 겹치는 포트는 뺀다)
    public List<Integer> poolPorts() {
        return poolPorts;
    }

    public boolean isPoolUrl(String baseUrl) {
        return poolPorts.stream().anyMatch(port -> poolBaseUrl(port).equals(baseUrl));
    }

    // 고정 서버(설정 순서) 다음에 관리자 화면에서 켠 서버. 첫 번째가 비율을 정하지 않았을 때의 기본 서버
    // 켜는 포트 중 응답하지 않는 포트는 목록에 넣지 않는다
    public List<Upstream> upstreams() {
        List<Upstream> current = cached;
        if (current == null || Instant.now().isAfter(cachedAt.plus(CACHE_TTL))) {
            current = refresh();
        }
        return current;
    }

    public List<Upstream> refresh() {
        List<Upstream> probed = new ArrayList<>();
        for (String baseUrl : baseUrls) {
            probed.add(probe(baseUrl));
        }
        for (int port : poolPorts) {
            Upstream upstream = probe(poolBaseUrl(port));
            if (upstream.up()) {
                probed.add(upstream);
            }
        }
        cached = List.copyOf(probed);
        cachedAt = Instant.now();
        return cached;
    }

    // 이 모델을 서빙하는 켜진 서버
    public Optional<Upstream> findAlive(String modelBundle) {
        return upstreams().stream().filter(u -> u.up() && modelBundle.equals(u.modelBundle())).findFirst();
    }

    private Upstream probe(String baseUrl) {
        try {
            JsonNode body = probeClient.get().uri(baseUrl + "/api/v2/recommendation-options").retrieve().body(JsonNode.class);
            JsonNode data = body == null ? null : body.path("data");
            if (data == null || !data.path("modelBundle").isString()) {
                return new Upstream(baseUrl, false, null, null, false, null, null);
            }
            return new Upstream(baseUrl, true, data.path("modelBundle").asString(),
                    data.path("rankerSchema").asString(null), data.path("scenarioSupported").asBoolean(false),
                    data.path("catalogCount").isNumber() ? data.path("catalogCount").asInt() : null,
                    data.path("modelNames").isNumber() ? data.path("modelNames").asInt() : null);
        } catch (Exception e) {
            log.debug("recommendation upstream {} not reachable: {}", baseUrl, e.getMessage());
            return new Upstream(baseUrl, false, null, null, false, null, null);
        }
    }
}
