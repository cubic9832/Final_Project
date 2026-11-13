-- 일반 회원 테스트 계정 5개를 모든 DB(로컬 · 배포 서버)에 만든다.
-- 예전에는 UserAccountSeeder 가 admin-seed.local.properties 값으로 만들었지만, 이 파일은 배포 패키지에 들어가지 않아 서버에는 계정이 생기지 않았다.
-- 실제 회원처럼 회원 · 개인 정보 · 약관 동의 기록과 재무 진단 1건(소득 · 지출 · 대출 · 예금)을 함께 만든다.
-- 다섯 계정의 비밀번호는 모두 같고, BCrypt 해시만 저장한다. 원문은 팀에서 정한 테스트 계정 비밀번호다.
-- 이미 가입한 이메일(예전 시드로 만든 로컬 계정)은 건드리지 않는다. 전화번호는 실제로 쓰이지 않는 010-0000-xxxx 대역이다.

CREATE TEMPORARY TABLE seed_user_v46 (
    n INT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    nick_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    driving_experience VARCHAR(20) NOT NULL,
    purchase_timing VARCHAR(20) NOT NULL,
    monthly_income DECIMAL(15, 2) NOT NULL, -- 기타 정기소득 포함 (재무 진단 저장 요청과 같은 규칙)
    other_income DECIMAL(15, 2) NOT NULL,
    monthly_expense DECIMAL(15, 2) NOT NULL,
    purchase_funds DECIMAL(15, 2) NOT NULL,
    price_upper DECIMAL(15, 2) NOT NULL,
    user_id BIGINT NULL
);

INSERT INTO seed_user_v46 (n, email, nick_name, phone, birth_date, gender, driving_experience, purchase_timing,
                           monthly_income, other_income, monthly_expense, purchase_funds, price_upper) VALUES
-- 사회초년생 · 첫 차 · 학자금 상환 중
(1, 'junhyuk.park97@example.com', '준혁97',   '01000000101', '1997-04-12', 'MALE',   'UNDER_1Y',  'WITHIN_6M', 2800000, 0,       1600000, 15000000, 28000000),
-- 30대 직장인 · 전세 거주 · 부업 소득
(2, 'seoyeon.lee90@example.com',  '이서연',   '01000000102', '1990-09-03', 'FEMALE', 'YEARS_1_3', 'WITHIN_3M', 4500000, 300000,  2300000, 30000000, 45000000),
-- 40대 4인 가족 · 주택담보 · 기존 차 할부 → 여유금이 빠듯하다
(3, 'kimdh83@example.com',        '도현아빠', '01000000103', '1983-01-27', 'MALE',   'OVER_3Y',   'WITHIN_1Y', 5500000, 0,       3600000, 10000000, 20000000),
-- 20대 · 면허만 있음 · 대출 없음
(4, 'yuna_choi99@example.com',    '유나첫차', '01000000104', '1999-11-18', 'FEMALE', 'NONE',      'UNDECIDED', 2400000, 0,       1500000, 8000000,  18000000),
-- 50대 · 임대 소득 · 여유 자금 많음
(5, 'jungmin.han74@example.com',  '한정민',   '01000000105', '1974-06-09', 'MALE',   'OVER_3Y',   'WITHIN_3M', 8000000, 1000000, 3500000, 60000000, 70000000);

CREATE TEMPORARY TABLE seed_loan_v46 (
    n INT NOT NULL,
    loan_type VARCHAR(30) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL,
    payment DECIMAL(15, 2) NOT NULL
);

INSERT INTO seed_loan_v46 VALUES
(1, '학자금대출',   8000000,   150000),
(2, '전세자금대출', 120000000, 450000),
(3, '주택담보대출', 250000000, 1200000),
(3, '자동차대출',   6000000,   350000),
(5, '신용대출',     20000000,  500000);

-- 이미 있는 이메일은 대상에서 뺀다. 임시 표와 users 의 기본 정렬 규칙(collation)이 DB 마다 달라 바이트로 비교한다 (V26 과 같은 방식)
DELETE s FROM seed_user_v46 s JOIN users u ON CAST(u.email AS BINARY) = CAST(s.email AS BINARY);

-- 닉네임이 이미 쓰이고 있으면 뒤에 번호를 붙인다 (users.nick_name UNIQUE)
INSERT INTO users (email, password_hash, nick_name, role)
SELECT s.email, '$2a$10$uWVdp1T.wuANdEiWCJdodutr31DhLEsJCVwpIZA1mP5tV/litBeaK',
       IF(EXISTS (SELECT 1 FROM users u WHERE CAST(u.nick_name AS BINARY) = CAST(s.nick_name AS BINARY)), CONCAT(s.nick_name, '_', s.n), s.nick_name),
       'USER'
FROM seed_user_v46 s;

UPDATE seed_user_v46 s JOIN users u ON CAST(u.email AS BINARY) = CAST(s.email AS BINARY) SET s.user_id = u.id;

INSERT INTO user_profiles (user_id, phone, birth_date, gender, driving_experience, purchase_timing)
SELECT user_id, phone, birth_date, gender, driving_experience, purchase_timing FROM seed_user_v46;

-- 회원가입 때와 같은 동의 기록 (UserAgreementDto.atSignup: 알림은 IMPORTANT)
INSERT INTO user_agreements (user_id, terms_agreed_at, privacy_agreed_at, email_notification, updates_agreed_at)
SELECT user_id, NOW(), NOW(), 'IMPORTANT', NULL FROM seed_user_v46;

-- 재무 진단 1건: 입력 버전 → 소득 · 지출 · 예금 → 대출 → 분석 결과 (DiagnosisServiceImpl.save 와 같은 순서)
INSERT IGNORE INTO model_versions (model_name, version_label, execution_type, description)
VALUES ('vehicle-candidate-recommender', 'candidate-v2', 'ML', '차량 후보 추천 모델 (FastAPI)');

INSERT INTO input_snapshots (user_id, status_code, submitted_at)
SELECT user_id, 'SUBMITTED', NOW() FROM seed_user_v46;

-- 새로 만든 회원이라 회원마다 입력 버전이 정확히 1건이다
CREATE TEMPORARY TABLE seed_snapshot_v46 AS
SELECT s.*, i.snapshot_id
FROM seed_user_v46 s JOIN input_snapshots i ON i.user_id = s.user_id;

INSERT INTO financial_profiles (snapshot_id, monthly_net_income, monthly_living_expense, available_cash, monthly_other_income)
SELECT snapshot_id, monthly_income, monthly_expense, purchase_funds, other_income FROM seed_snapshot_v46;

INSERT INTO loan_inputs (snapshot_id, loan_type_code, balance_amount, monthly_repayment)
SELECT s.snapshot_id, l.loan_type, l.balance, l.payment
FROM seed_snapshot_v46 s JOIN seed_loan_v46 l ON l.n = s.n;

-- 월 여유금 = 월 소득 - 월 지출 - 대출 상환액 합계
INSERT INTO analysis_runs (snapshot_id, model_version_id, status_code, monthly_available_amount, recommended_price_max, completed_at)
SELECT s.snapshot_id, v.model_version_id, 'COMPLETED',
       s.monthly_income - s.monthly_expense - COALESCE((SELECT SUM(l.payment) FROM seed_loan_v46 l WHERE l.n = s.n), 0),
       s.price_upper, NOW()
FROM seed_snapshot_v46 s
JOIN model_versions v ON v.model_name = 'vehicle-candidate-recommender' AND v.version_label = 'candidate-v2';

DROP TEMPORARY TABLE seed_snapshot_v46;
DROP TEMPORARY TABLE seed_loan_v46;
DROP TEMPORARY TABLE seed_user_v46;
