-- 모델 관리: 여러 추천 모델에 사용자를 비율로 나눠 보내기 (트래픽 분배) · 모델별 하루 추천 요청 수
-- 모델 이름(model_bundle)은 추천 서버가 응답하는 학습 결과 폴더 이름 (예: 20261103-unified-managed-3m)

-- 모델별 비율. 표가 비어 있으면 첫 번째 추천 서버로 모두 보낸다 (기존 동작)
CREATE TABLE recommendation_model_traffic (
    model_bundle VARCHAR(100) NOT NULL PRIMARY KEY,
    -- 이 모델로 보낼 사용자 비율 (0 ~ 100, 전체 합 100)
    weight_percent INT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- 바꾼 총관리자 (탈퇴하면 NULL — 운영 로그에도 남는다)
    updated_by BIGINT NULL,
    CONSTRAINT chk_recommendation_model_traffic_weight CHECK (weight_percent BETWEEN 0 AND 100),
    CONSTRAINT fk_recommendation_model_traffic_actor FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
);

-- 모델별 하루 추천 요청 수 (성공한 추천만). 화면의 "최근 7일 요청" 에 쓴다
CREATE TABLE recommendation_model_daily_usage (
    usage_date DATE NOT NULL,
    model_bundle VARCHAR(100) NOT NULL,
    request_count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (usage_date, model_bundle)
);
