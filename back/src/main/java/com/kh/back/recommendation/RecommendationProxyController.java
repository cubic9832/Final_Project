package com.kh.back.recommendation;

import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 재무 진단 화면의 추천 요청 입구. 관리자가 정한 비율대로 여러 추천 서버(모델) 중 하나로 넘긴다.
 * 누구나 (비회원도 추천을 받는다 — SecurityConfig permitAll).
 * 같은 사용자는 같은 모델: 로그인했으면 회원 번호, 아니면 화면이 보내는 X-Visitor-Id(브라우저에 저장한 익명 ID)로 정한다.
 */
@RestController
@RequestMapping("/api/v1/recommendation")
@RequiredArgsConstructor
public class RecommendationProxyController {

    static final String VISITOR_HEADER = "X-Visitor-Id";
    private static final Pattern VISITOR_ID = Pattern.compile("^[A-Za-z0-9-]{8,64}$");

    private final RecommendationProxyService proxyService;

    // GET /api/v1/recommendation/options — 호출: financialRecommendationApi.getRecommendationOptions
    @GetMapping("/options")
    public ResponseEntity<?> options(@AuthenticationPrincipal Long userId,
                                     @RequestHeader(value = VISITOR_HEADER, required = false) String visitorId) {
        return proxyService.forward(subjectKey(userId, visitorId), HttpMethod.GET, "/api/v2/recommendation-options", null, false);
    }

    // POST /api/v1/recommendation/recommendations — 호출: financialRecommendationApi.getFinancialRecommendations
    @PostMapping("/recommendations")
    public ResponseEntity<?> recommendations(@AuthenticationPrincipal Long userId,
                                             @RequestHeader(value = VISITOR_HEADER, required = false) String visitorId,
                                             @RequestBody byte[] body) {
        return proxyService.forward(subjectKey(userId, visitorId), HttpMethod.POST, "/api/v2/recommendations", body, true);
    }

    // 익명 ID 가 없거나 이상하면 모두 같은 키 → 비율을 정하지 않은 것처럼 한 모델로 모인다 (화면은 항상 보낸다)
    static String subjectKey(Long userId, String visitorId) {
        if (userId != null) {
            return "member:" + userId;
        }
        return visitorId != null && VISITOR_ID.matcher(visitorId).matches() ? "visitor:" + visitorId : "visitor:anonymous";
    }
}
