-- 모델 관리(/console?tab=models) 비교 표 · 트래픽 분배 카드의 "최근 7일 요청" · "저장된 진단" 이 비어 보이지 않도록 넣는 데모 데이터.
-- 대상 모델: git 에 있는 화면 호환 학습 결과 폴더 3개 (20261103-unified-managed-3m · 20261102-height-high-value-3m · 20261030-ui-v1-10k)
--
-- 트래픽 비율(recommendation_model_traffic)은 넣지 않는다:
--   비율은 실제 추천 경로를 바꾸고, 꺼진 모델에 비율이 남으면 [끄기]가 막힌다 → 관리자가 화면에서 정한다.
--
-- 데모 표식 · 지우는 방법
--   요청 수: 오늘을 뺀 지난 7일 (오늘부터 쌓이는 실제 요청과 섞이지 않게). 적용한 날짜 기준이므로 그 날짜로 지운다
--     DELETE FROM recommendation_model_daily_usage
--     WHERE model_bundle IN ('20261103-unified-managed-3m', '20261102-height-high-value-3m', '20261030-ui-v1-10k')
--       AND usage_date BETWEEN <적용일> - INTERVAL 7 DAY AND <적용일> - INTERVAL 1 DAY;
--   진단: V26 데모 회원('%@demo.compa.local')의 진단이라 V26 머리의 삭제 순서(analysis_runs → input_snapshots → users)로 함께 지워진다
-- 날짜는 적용 시점(NOW()) 기준 상대값이다 (V26 과 같음)

-- 1. 모델별 하루 추천 요청 수 (지난 7일) -------------------------------------------------------------
-- 20261103 이 대부분을 받다가 최근 3일 동안 다른 두 모델에 조금씩 나눈 모습
CREATE TEMPORARY TABLE demo_model_usage (
    days_ago INT,
    model_bundle VARCHAR(100),
    request_count BIGINT
);

INSERT INTO demo_model_usage VALUES
 (7, '20261103-unified-managed-3m', 42), (6, '20261103-unified-managed-3m', 38), (5, '20261103-unified-managed-3m', 51),
 (4, '20261103-unified-managed-3m', 47), (3, '20261103-unified-managed-3m', 33), (2, '20261103-unified-managed-3m', 29),
 (1, '20261103-unified-managed-3m', 31),
 (3, '20261102-height-high-value-3m', 9), (2, '20261102-height-high-value-3m', 12), (1, '20261102-height-high-value-3m', 11),
 (3, '20261030-ui-v1-10k', 6), (2, '20261030-ui-v1-10k', 8), (1, '20261030-ui-v1-10k', 7);

-- 이미 같은 날 실제 요청이 있으면 더한다 (덮어쓰지 않는다)
INSERT INTO recommendation_model_daily_usage (usage_date, model_bundle, request_count)
SELECT CURRENT_DATE - INTERVAL days_ago DAY, model_bundle, request_count FROM demo_model_usage
ON DUPLICATE KEY UPDATE request_count = recommendation_model_daily_usage.request_count + VALUES(request_count);

-- 2. 모델별 저장된 재무 진단 (모델 버전 = 학습 결과 폴더 이름, DiagnosisServiceImpl 과 같은 이름 · 라벨) ------------
INSERT IGNORE INTO model_versions (model_name, version_label, execution_type, description, created_at)
VALUES ('vehicle-candidate-recommender', '20261103-unified-managed-3m', 'ML', '재무 진단 추천 서버 (FastAPI)', NOW() - INTERVAL 7 DAY),
       ('vehicle-candidate-recommender', '20261102-height-high-value-3m', 'ML', '재무 진단 추천 서버 (FastAPI)', NOW() - INTERVAL 3 DAY),
       ('vehicle-candidate-recommender', '20261030-ui-v1-10k', 'ML', '재무 진단 추천 서버 (FastAPI)', NOW() - INTERVAL 3 DAY);

CREATE TEMPORARY TABLE demo_model_member AS
SELECT id AS user_id, ROW_NUMBER() OVER (ORDER BY id) AS n FROM users WHERE email LIKE '%@demo.compa.local';

CREATE TEMPORARY TABLE demo_model_diagnosis (
    member_n INT,
    days_ago INT,
    version_label VARCHAR(50),
    monthly_income DECIMAL(15, 2),
    monthly_expense DECIMAL(15, 2),
    purchase_funds DECIMAL(15, 2),
    monthly_available_amount DECIMAL(15, 2),
    recommended_price_max DECIMAL(15, 2)
);

INSERT INTO demo_model_diagnosis VALUES
 (2, 6, '20261103-unified-managed-3m', 4200000, 2600000, 30000000, 1600000, 38000000),
 (8, 5, '20261103-unified-managed-3m', 3100000, 2200000, 15000000, 900000, 23000000),
 (10, 4, '20261103-unified-managed-3m', 5200000, 3000000, 45000000, 2200000, 50000000),
 (12, 2, '20261103-unified-managed-3m', 3600000, 2400000, 20000000, 1200000, 30000000),
 (16, 1, '20261103-unified-managed-3m', 2800000, 2100000, 10000000, 700000, 19000000),
 (18, 3, '20261102-height-high-value-3m', 4600000, 2900000, 35000000, 1700000, 41000000),
 (22, 1, '20261102-height-high-value-3m', 3900000, 2600000, 25000000, 1300000, 33000000),
 (25, 2, '20261030-ui-v1-10k', 3300000, 2300000, 18000000, 1000000, 26000000);

CREATE TEMPORARY TABLE demo_model_snapshot AS
SELECT d.*, m.user_id, NOW() - INTERVAL d.days_ago DAY - INTERVAL (d.member_n * 17) MOD 300 MINUTE AS diagnosed_at
FROM demo_model_diagnosis d JOIN demo_model_member m ON m.n = d.member_n;

INSERT INTO input_snapshots (user_id, status_code, is_example, created_at, submitted_at)
SELECT user_id, 'SUBMITTED', FALSE, diagnosed_at, diagnosed_at FROM demo_model_snapshot;

-- financial_profiles 는 넣지 않는다 (V26 과 같음): FK 에 CASCADE 가 없어 V26 의 삭제 순서로 지울 수 없게 되기 때문

INSERT INTO analysis_runs (snapshot_id, model_version_id, status_code, monthly_available_amount, recommended_price_max, requested_at, completed_at)
SELECT s.snapshot_id, v.model_version_id, 'COMPLETED', d.monthly_available_amount, d.recommended_price_max, d.diagnosed_at, d.diagnosed_at + INTERVAL 2 SECOND
FROM demo_model_snapshot d
JOIN input_snapshots s ON s.user_id = d.user_id AND s.created_at = d.diagnosed_at
JOIN model_versions v ON v.model_name = 'vehicle-candidate-recommender' AND CAST(v.version_label AS BINARY) = CAST(d.version_label AS BINARY);

DROP TEMPORARY TABLE demo_model_usage;
DROP TEMPORARY TABLE demo_model_member;
DROP TEMPORARY TABLE demo_model_diagnosis;
DROP TEMPORARY TABLE demo_model_snapshot;
