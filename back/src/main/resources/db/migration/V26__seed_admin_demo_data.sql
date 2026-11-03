-- 관리자 콘솔(/console)의 회원·운영 로그·1:1 상담·콤파 대화·재무 진단·차량 상태 화면이 비어 보이지 않도록 넣는 데모 데이터.
-- 데모 표식: 회원 이메일 '%@demo.compa.local', 차량 id 'demo-' 로 시작. 지울 때는 이 표식으로 지운다
--   DELETE FROM managed_vehicle_changes WHERE vehicle_id LIKE 'demo-%';
--   DELETE FROM managed_vehicles WHERE id LIKE 'demo-%';
--   DELETE FROM analysis_runs WHERE snapshot_id IN (SELECT snapshot_id FROM input_snapshots WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@demo.compa.local'));
--   DELETE FROM input_snapshots WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@demo.compa.local');
--   DELETE FROM admin_audit_logs WHERE detail LIKE '%@demo.compa.local%'
--       OR actor_id IN (SELECT id FROM users WHERE email LIKE '%@demo.compa.local')
--       OR target_id IN (SELECT id FROM users WHERE email LIKE '%@demo.compa.local');  -- 회원보다 먼저 (actor 는 SET NULL)
--   DELETE FROM users WHERE email LIKE '%@demo.compa.local';  -- 나머지 회원 데이터는 FK CASCADE 로 함께 지워진다
-- 데모 회원은 로그인할 수 없다: password_hash 가 BCrypt 형식이 아니라 어떤 비밀번호와도 맞지 않는다 (운영 DB 에도 들어가므로)
-- 테이블마다 콜레이션이 달라(0900_ai_ci · unicode_ci) 임시 테이블과 문자열로 조인할 때는 BINARY 로 비교한다
-- 날짜는 모두 적용 시점(NOW()) 기준 상대값이라 처음 적용한 날 기준으로 최근 30일 그래프가 채워진다

-- 1. 회원 ------------------------------------------------------------------------------------------
CREATE TEMPORARY TABLE demo_member (
    n INT PRIMARY KEY,
    nick_name VARCHAR(50),
    joined_days_ago INT,
    birth_date DATE NULL,
    gender VARCHAR(10) NULL,
    login_method VARCHAR(10),   -- EMAIL · GOOGLE(소셜 전용) · BOTH
    admin_role VARCHAR(20) NULL,
    suspension VARCHAR(10) NULL, -- TEMP = 며칠 뒤 풀림, PERMANENT = 영구
    sessions INT,
    driving_experience VARCHAR(20) NULL,
    purchase_timing VARCHAR(20) NULL
);

INSERT INTO demo_member VALUES
 (1,  '데모관리자민지', 29, '1990-04-12', 'FEMALE', 'EMAIL',  'ADMIN', NULL,        2, 'OVER_3Y',   'UNDECIDED'),
 (2,  '데모관리자준호', 28, '1988-11-03', 'MALE',   'BOTH',   'ADMIN', NULL,        1, 'OVER_3Y',   'UNDECIDED'),
 (3,  '첫차고민중',     27, '1999-02-21', 'MALE',   'EMAIL',  NULL,    NULL,        1, 'NONE',      'WITHIN_3M'),
 (4,  '출퇴근러',       26, '1994-07-30', 'FEMALE', 'GOOGLE', NULL,    NULL,        1, 'UNDER_1Y',  'WITHIN_6M'),
 (5,  '캠핑가자',       25, '1987-05-17', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'OVER_3Y',   'WITHIN_1Y'),
 (6,  '아이둘아빠',     24, '1984-09-09', 'MALE',   'BOTH',   NULL,    NULL,        2, 'OVER_3Y',   'WITHIN_3M'),
 (7,  '사회초년생',     23, '2001-12-01', 'FEMALE', 'EMAIL',  NULL,    NULL,        1, 'NONE',      'WITHIN_1Y'),
 (8,  '전기차궁금',     22, '1996-03-25', 'NONE',   'EMAIL',  NULL,    NULL,        0, 'YEARS_1_3', 'UNDECIDED'),
 (9,  '주말드라이버',   21, '1979-08-14', 'MALE',   'GOOGLE', NULL,    NULL,        1, 'OVER_3Y',   'WITHIN_6M'),
 (10, '경차사랑',       20, '2003-01-19', 'FEMALE', 'EMAIL',  NULL,    NULL,        0, 'NONE',      'WITHIN_3M'),
 (11, '하이브리드파',   19, '1991-06-06', 'MALE',   'EMAIL',  NULL,    NULL,        1, 'YEARS_1_3', 'WITHIN_6M'),
 (12, '세단이좋아',     18, '1975-10-28', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'OVER_3Y',   'UNDECIDED'),
 (13, '신혼부부차',     17, '1993-04-02', 'FEMALE', 'BOTH',   NULL,    NULL,        1, 'UNDER_1Y',  'WITHIN_3M'),
 (14, '중고vs신차',     16, '1998-09-15', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'NONE',      'WITHIN_1Y'),
 (15, 'SUV찾는중',      15, '1986-02-11', 'FEMALE', 'GOOGLE', NULL,    NULL,        1, 'OVER_3Y',   'WITHIN_6M'),
 (16, '연비왕',         14, '1970-12-24', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'OVER_3Y',   'UNDECIDED'),
 (17, '드림카저축',     14, '2000-05-05', 'FEMALE', 'EMAIL',  NULL,    NULL,        1, 'NONE',      'UNDECIDED'),
 (18, '퇴근길드라이브', 13, '1989-07-21', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'YEARS_1_3', 'WITHIN_1Y'),
 (19, '반려견과함께',   12, '1995-11-11', 'FEMALE', 'BOTH',   NULL,    NULL,        1, 'UNDER_1Y',  'WITHIN_3M'),
 (20, '할부계산중',     12, '1997-08-08', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'NONE',      'WITHIN_6M'),
 (21, '대중교통탈출',   11, '2002-03-03', 'FEMALE', 'EMAIL',  NULL,    NULL,        1, 'NONE',      'WITHIN_3M'),
 (22, '장거리출장',     10, '1982-01-30', 'MALE',   'GOOGLE', NULL,    NULL,        1, 'OVER_3Y',   'WITHIN_1Y'),
 (23, '도로위초보',     10, NULL,         NULL,     'EMAIL',  NULL,    NULL,        0, NULL,        NULL),
 (24, '패밀리카',        9, '1983-06-18', 'FEMALE', 'EMAIL',  NULL,    NULL,        1, 'OVER_3Y',   'WITHIN_6M'),
 (25, '스포츠카로망',    8, '1992-10-10', 'MALE',   'EMAIL',  NULL,    'TEMP',      0, 'YEARS_1_3', 'UNDECIDED'),
 (26, '시골길드라이버',  8, '1968-04-04', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'OVER_3Y',   'UNDECIDED'),
 (27, '차알못',          7, NULL,         NULL,     'GOOGLE', NULL,    NULL,        1, NULL,        NULL),
 (28, '소형SUV러버',     6, '1999-12-12', 'FEMALE', 'EMAIL',  NULL,    NULL,        1, 'UNDER_1Y',  'WITHIN_3M'),
 (29, '예산은3천',       6, '1990-01-01', NULL,     'EMAIL',  NULL,    NULL,        0, 'NONE',      'WITHIN_6M'),
 (30, '차박꿈나무',      5, '1994-05-25', 'MALE',   'BOTH',   NULL,    NULL,        2, 'YEARS_1_3', 'WITHIN_1Y'),
 (31, '보험료걱정',      5, NULL,         NULL,     'EMAIL',  NULL,    NULL,        0, NULL,        NULL),
 (32, '첫월급첫차',      4, '2002-09-30', 'FEMALE', 'EMAIL',  NULL,    NULL,        1, 'NONE',      'WITHIN_3M'),
 (33, '욕설금지대상',    4, '1997-02-14', 'MALE',   'EMAIL',  NULL,    'TEMP',      0, 'YEARS_1_3', 'UNDECIDED'),
 (34, '조용한운전자',    3, '1985-03-08', 'NONE',   'GOOGLE', NULL,    NULL,        1, 'OVER_3Y',   'UNDECIDED'),
 (35, '오토캠핑',        3, '1991-08-19', 'MALE',   'EMAIL',  NULL,    NULL,        0, 'OVER_3Y',   'WITHIN_6M'),
 (36, '광고계정의심',    2, NULL,         NULL,     'EMAIL',  NULL,    'PERMANENT', 0, NULL,        NULL),
 (37, '전기차충전러',    2, '1996-06-16', 'FEMALE', 'EMAIL',  NULL,    NULL,        1, 'UNDER_1Y',  'WITHIN_3M'),
 (38, '오늘가입',        1, '2001-07-07', 'MALE',   'EMAIL',  NULL,    NULL,        1, 'NONE',      'WITHIN_1Y'),
 (39, '방금가입',        0, NULL,         NULL,     'GOOGLE', NULL,    NULL,        1, NULL,        NULL),
 (40, '새내기운전',      0, '2004-04-20', 'FEMALE', 'EMAIL',  NULL,    NULL,        0, 'NONE',      'UNDECIDED');

INSERT INTO users (email, password_hash, nick_name, role, created_at, updated_at, suspended_until)
SELECT CONCAT('demo', LPAD(n, 2, '0'), '@demo.compa.local'),
       IF(login_method = 'GOOGLE', 'SOCIAL_ONLY', 'DEMO-ACCOUNT-NO-LOGIN'),
       nick_name, 'USER',
       NOW() - INTERVAL joined_days_ago DAY - INTERVAL (n * 37) MOD 600 MINUTE,
       NOW() - INTERVAL joined_days_ago DAY - INTERVAL (n * 37) MOD 600 MINUTE,
       CASE suspension WHEN 'TEMP' THEN NOW() + INTERVAL (n MOD 5 + 2) DAY
                       WHEN 'PERMANENT' THEN '9999-12-31 23:59:59' END
FROM demo_member;

-- 한 쿼리에서 두 번 조인해야 해서(관리자 · 대상) 임시 테이블 대신 일반 테이블로 두고 마지막에 지운다
CREATE TABLE demo_seed_user AS
SELECT m.*, u.id AS user_id, u.created_at AS joined_at
FROM demo_member m JOIN users u ON u.email = CONCAT('demo', LPAD(m.n, 2, '0'), '@demo.compa.local');

-- 생년월일 · 성별을 모두 비운 회원은 프로필 행 없이 둔다 → 개요 '프로필 미입력' 수치
INSERT INTO user_profiles (user_id, birth_date, gender, driving_experience, purchase_timing, created_at, updated_at)
SELECT user_id, birth_date, gender, driving_experience, purchase_timing, joined_at, joined_at
FROM demo_seed_user WHERE birth_date IS NOT NULL OR gender IS NOT NULL;

INSERT INTO social_accounts (user_id, provider, provider_user_id, email, created_at)
SELECT user_id, 'GOOGLE', CONCAT('demo-google-', n), CONCAT('demo', LPAD(n, 2, '0'), '@demo.compa.local'), joined_at
FROM demo_seed_user WHERE login_method IN ('GOOGLE', 'BOTH');

INSERT INTO admin_accounts (user_id, role, created_at)
SELECT user_id, admin_role, joined_at FROM demo_seed_user WHERE admin_role IS NOT NULL;

INSERT INTO user_agreements (user_id, terms_agreed_at, privacy_agreed_at, email_notification, updates_agreed_at, updated_at)
SELECT user_id, joined_at, joined_at, ELT(n MOD 3 + 1, 'IMPORTANT', 'ALL', 'NONE'), IF(n MOD 3 = 1, joined_at, NULL), joined_at
FROM demo_seed_user;

-- 로그인 유지 세션 (회원 상세의 '로그인된 기기' · '마지막 사용'). token 은 UUID 길이(36)에 맞춘 데모 값
INSERT INTO refresh_token (user_id, token, expires_at, created_at, device, logged_in_at)
SELECT d.user_id, CONCAT('demo-', LPAD(d.n, 2, '0'), '-', s.k, '-', LEFT(MD5(CONCAT(d.n, '-', s.k)), 24)),
       NOW() + INTERVAL 14 DAY - INTERVAL s.k HOUR,
       NOW() - INTERVAL (d.n * 7 + s.k * 13) MOD 72 HOUR,
       ELT(s.k, 'Chrome · macOS', 'Safari · iOS'),
       NOW() - INTERVAL (d.n * 7 + s.k * 13) MOD 72 HOUR
FROM demo_seed_user d JOIN (SELECT 1 AS k UNION ALL SELECT 2) s ON s.k <= d.sessions;

-- 2. 1:1 상담 ---------------------------------------------------------------------------------------
CREATE TEMPORARY TABLE demo_room (
    member_n INT PRIMARY KEY,
    status VARCHAR(20),
    admin_n INT NULL,
    hours_ago INT,
    restricted_days INT NULL,  -- 9999 = 영구
    warning_count INT,
    feedback_open BOOLEAN
);

INSERT INTO demo_room VALUES
 (21, 'WAITING', NULL, 1,  NULL, 0, FALSE),
 (28, 'WAITING', NULL, 3,  NULL, 0, FALSE),
 (32, 'WAITING', NULL, 5,  NULL, 0, FALSE),
 (37, 'WAITING', NULL, 8,  NULL, 0, FALSE),
 (5,  'ACTIVE',  1,    2,  NULL, 0, FALSE),
 (13, 'ACTIVE',  2,    6,  NULL, 0, FALSE),
 (20, 'ACTIVE',  1,    20, NULL, 1, FALSE),
 (6,  'CLOSED',  1,    30, NULL, 0, FALSE),
 (11, 'CLOSED',  2,    52, NULL, 0, FALSE),
 (15, 'CLOSED',  1,    75, NULL, 0, FALSE),
 (19, 'CLOSED',  2,    98, NULL, 0, FALSE),
 (24, 'CLOSED',  1,    130, NULL, 0, FALSE),
 (33, 'CLOSED',  2,    40, 5,    2, FALSE);

INSERT INTO chat_room (user_id, status, assigned_admin_id, restricted_until, warning_count, feedback_open, created_at, updated_at)
SELECT m.user_id, r.status, a.user_id,
       CASE WHEN r.restricted_days = 9999 THEN '9999-12-31 23:59:59'
            WHEN r.restricted_days IS NOT NULL THEN NOW() + INTERVAL r.restricted_days DAY END,
       r.warning_count, r.feedback_open,
       NOW() - INTERVAL r.hours_ago HOUR, NOW() - INTERVAL r.hours_ago HOUR
FROM demo_room r
JOIN demo_seed_user m ON m.n = r.member_n
LEFT JOIN demo_seed_user a ON a.n = r.admin_n;

CREATE TEMPORARY TABLE demo_chat_message (
    member_n INT,
    seq INT,
    sender_type VARCHAR(20),
    content VARCHAR(1000)
);

INSERT INTO demo_chat_message VALUES
 (21, 1, 'USER',   '재무 진단 결과에서 월 여유금이 너무 적게 나와요. 입력을 다시 할 수 있나요?'),
 (28, 1, 'USER',   '추천 차량 목록에 소형 SUV만 나오는데 세단도 보고 싶어요.'),
 (32, 1, 'USER',   '첫 차로 할부와 리스 중 뭐가 나을지 상담받고 싶습니다.'),
 (32, 2, 'USER',   '연봉은 3천 초반이고 출퇴근용이에요.'),
 (37, 1, 'USER',   '전기차 보조금도 계산에 들어가나요?'),
 (5,  1, 'USER',   '캠핑용으로 차박 가능한 차를 찾고 있어요.'),
 (5,  2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (5,  3, 'ADMIN',  '안녕하세요. 차박을 생각하시면 2열 폴딩 시 평탄화가 되는 SUV를 먼저 보시는 걸 권해 드려요.'),
 (5,  4, 'USER',   '예산은 4천만 원 정도입니다.'),
 (13, 1, 'USER',   '신혼부부인데 차 한 대를 같이 쓰려고 해요.'),
 (13, 2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (13, 3, 'ADMIN',  '두 분의 출퇴근 거리를 알려 주시면 유지비 기준으로 비교해 드릴게요.'),
 (20, 1, 'USER',   '할부 금리를 바꿔서 계산할 수는 없나요? 진짜 답답하네요'),
 (20, 2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (20, 3, 'ADMIN',  '차량 비교 화면에서 금리를 직접 바꿔 계산하실 수 있어요.'),
 (20, 4, 'SYSTEM', '운영 정책 위반 경고 1회: 상담원에게 불쾌감을 주는 표현'),
 (6,  1, 'USER',   '아이 둘 카시트를 달 수 있는 차가 뭐가 있을까요?'),
 (6,  2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (6,  3, 'ADMIN',  '2열 ISOFIX가 두 개 이상인 중형 SUV와 미니밴을 추천 목록에서 거르실 수 있어요.'),
 (6,  4, 'USER',   '감사합니다. 많이 도움이 됐어요.'),
 (6,  5, 'SYSTEM', '상담이 종료되었습니다.'),
 (11, 1, 'USER',   '하이브리드 연비가 실제로도 표시만큼 나오나요?'),
 (11, 2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (11, 3, 'ADMIN',  '표시 연비는 공인 연비라 주행 습관에 따라 달라질 수 있어요.'),
 (11, 4, 'SYSTEM', '상담이 종료되었습니다.'),
 (15, 1, 'USER',   'SUV 추천에서 가격 순으로 정렬할 수 있나요?'),
 (15, 2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (15, 3, 'ADMIN',  '현재는 적합도 순으로만 보여 드리고 있어요. 의견 전달하겠습니다.'),
 (15, 4, 'SYSTEM', '상담이 종료되었습니다.'),
 (19, 1, 'USER',   '반려견 태우기 좋은 차를 알려 주세요.'),
 (19, 2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (19, 3, 'ADMIN',  '트렁크 개구부가 낮은 왜건이나 SUV가 편하실 거예요.'),
 (19, 4, 'SYSTEM', '상담이 종료되었습니다.'),
 (24, 1, 'USER',   '진단을 여러 번 하면 기록이 다 남나요?'),
 (24, 2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (24, 3, 'ADMIN',  '네, 마이페이지에서 지난 진단 결과를 다시 보실 수 있어요.'),
 (24, 4, 'SYSTEM', '상담이 종료되었습니다.'),
 (33, 1, 'USER',   '추천이 왜 이 모양이에요?'),
 (33, 2, 'SYSTEM', '상담원이 연결되었습니다.'),
 (33, 3, 'SYSTEM', '운영 정책 위반 경고 2회: 욕설 · 비하 표현'),
 (33, 4, 'SYSTEM', '운영 정책 위반으로 상담이 종료되었습니다.');

INSERT INTO chat_message (room_id, sender_type, sender_id, content, created_at)
SELECT c.id, cm.sender_type,
       CASE cm.sender_type WHEN 'USER' THEN c.user_id WHEN 'ADMIN' THEN c.assigned_admin_id END,
       cm.content, c.created_at + INTERVAL cm.seq * 3 MINUTE
FROM demo_chat_message cm
JOIN demo_seed_user m ON m.n = cm.member_n
JOIN chat_room c ON c.user_id = m.user_id;

UPDATE chat_room c
JOIN (SELECT room_id, MAX(created_at) AS last_at FROM chat_message GROUP BY room_id) lm ON lm.room_id = c.id
JOIN demo_seed_user m ON m.user_id = c.user_id
SET c.last_message_at = lm.last_at, c.updated_at = lm.last_at;

-- 상담 만족도 (총관리자만 보는 상담원별 평가 · 신고)
CREATE TEMPORARY TABLE demo_chat_feedback (
    member_n INT,
    rating INT,
    comment VARCHAR(200) NULL,
    reported BOOLEAN,
    report_reason VARCHAR(200) NULL
);

INSERT INTO demo_chat_feedback VALUES
 (6,  5, '친절하게 알려 주셨어요.', FALSE, NULL),
 (11, 4, '설명이 이해하기 쉬웠습니다.', FALSE, NULL),
 (15, 1, '질문에 제대로 답을 안 해 줘요.', TRUE, '불성실한 답변'),
 (19, 5, NULL, FALSE, NULL),
 (24, 3, '답변이 조금 늦었어요.', FALSE, NULL),
 (33, 1, '상담원이 일방적으로 끊었습니다.', TRUE, '부당한 상담 종료');

INSERT INTO chat_feedback (room_id, admin_id, rating, comment, reported, report_reason, created_at)
SELECT c.id, c.assigned_admin_id, f.rating, f.comment, f.reported, f.report_reason, c.last_message_at + INTERVAL 2 MINUTE
FROM demo_chat_feedback f
JOIN demo_seed_user m ON m.n = f.member_n
JOIN chat_room c ON c.user_id = m.user_id;

INSERT INTO chat_quick_reply (admin_id, content)
SELECT a.user_id, q.content
FROM demo_seed_user a
JOIN (SELECT '안녕하세요, CreditComPass 상담원입니다. 무엇을 도와드릴까요?' AS content
      UNION ALL SELECT '확인 후 바로 안내해 드리겠습니다. 잠시만 기다려 주세요.'
      UNION ALL SELECT '더 궁금하신 점이 있으면 언제든 다시 문의해 주세요.') q
WHERE a.admin_role IS NOT NULL;

-- 3. 운영 로그 --------------------------------------------------------------------------------------
-- 실제 작업이 남기는 detail 형식을 따른다 (AdminMemberServiceImpl · ChatRoomServiceImpl · MailSendLogger). {1} · {2} = 데모 관리자 1 · 2 의 회원 번호
CREATE TEMPORARY TABLE demo_audit (
    hours_ago INT,
    actor_n INT NULL,
    action VARCHAR(30),
    target_type VARCHAR(20),
    target_n INT NULL,
    detail VARCHAR(255)
);

INSERT INTO demo_audit VALUES
 (690, 2, 'ROLE_CHANGE',      'MEMBER', 1,    'USER → ADMIN'),
 (670, 1, 'ROLE_CHANGE',      'MEMBER', 2,    'USER → ADMIN'),
 (600, 1, 'LOGIN_UNLOCK',     'MEMBER', 12,   '로그인 잠금 해제'),
 (520, 2, 'ROLE_CHANGE',      'MEMBER', 9,    'USER → ADMIN'),
 (500, 2, 'ROLE_CHANGE',      'MEMBER', 9,    'ADMIN → USER'),
 (430, 2, 'CHAT_TRANSFER',    'MEMBER', 24,   '상담 넘김 #{2} → #{1} (담당 분야)'),
 (300, 2, 'LOGIN_UNLOCK',     'MEMBER', 18,   '로그인 잠금 해제'),
 (190, 1, 'MEMBER_SUSPEND',   'MEMBER', 25,   '계정 정지 7일 (부적절한 게시물 반복)'),
 (170, 1, 'MEMBER_UNSUSPEND', 'MEMBER', 14,   '계정 정지 풀기'),
 (120, 2, 'CHAT_WARN',        'MEMBER', 33,   '상담 경고 1회 (욕설 · 비하 표현)'),
 (98,  2, 'CHAT_WARN',        'MEMBER', 33,   '상담 경고 2회 (욕설 · 비하 표현)'),
 (96,  2, 'CHAT_RESTRICT',    'MEMBER', 33,   '상담 제한 5일 (욕설 · 비하 표현)'),
 (90,  1, 'MEMBER_SUSPEND',   'MEMBER', 33,   '계정 정지 3일 (상담원 대상 폭언)'),
 (60,  1, 'CHAT_RESTRICT',    'MEMBER', 36,   '상담 제한 영구 (광고 · 스팸)'),
 (58,  1, 'MEMBER_SUSPEND',   'MEMBER', 36,   '계정 정지 영구 (광고 · 스팸 계정)'),
 (40,  2, 'CHAT_UNRESTRICT',  'MEMBER', 12,   '상담 제한 풀기'),
 (20,  1, 'CHAT_WARN',        'MEMBER', 20,   '상담 경고 1회 (상담원에게 불쾌감을 주는 표현)'),
 (6,   1, 'CHAT_TRANSFER',    'MEMBER', 13,   '상담 넘김 #{1} → #{2} (교대 근무)'),
 (3,   2, 'LOGIN_UNLOCK',     'MEMBER', 31,   '로그인 잠금 해제'),
 -- 인증 메일 기록: actor 없음, 대상 MAIL. 운영 로그의 '전체' 에서는 빠지고 작업 필터로만 보인다
 (650, NULL, 'MAIL_SENT',   'MAIL', NULL, 'd***@demo.compa.local'),
 (400, NULL, 'MAIL_SENT',   'MAIL', NULL, 'd***@demo.compa.local'),
 (240, NULL, 'MAIL_SENT',   'MAIL', NULL, 'd***@demo.compa.local'),
 (110, NULL, 'MAIL_SENT',   'MAIL', NULL, 'd***@demo.compa.local'),
 (50,  NULL, 'MAIL_FAILED', 'MAIL', NULL, 'd***@demo.compa.local · MailSendException: Connection timed out'),
 (12,  NULL, 'MAIL_SENT',   'MAIL', NULL, 'd***@demo.compa.local'),
 (2,   NULL, 'MAIL_SENT',   'MAIL', NULL, 'd***@demo.compa.local');

INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, detail, created_at)
SELECT a.user_id, l.action, l.target_type, t.user_id,
       REPLACE(REPLACE(l.detail, '{1}', (SELECT user_id FROM demo_seed_user WHERE n = 1)), '{2}', (SELECT user_id FROM demo_seed_user WHERE n = 2)),
       NOW() - INTERVAL l.hours_ago HOUR
FROM demo_audit l
LEFT JOIN demo_seed_user a ON a.n = l.actor_n
LEFT JOIN demo_seed_user t ON t.n = l.target_n;

-- 4. 콤파(챗봇) 대화와 평가 --------------------------------------------------------------------------
CREATE TEMPORARY TABLE demo_bot (
    member_n INT,
    days_ago INT,
    seq INT,
    question VARCHAR(500),
    question_source VARCHAR(20),
    guide_id VARCHAR(80) NULL,
    answer TEXT,
    answer_type VARCHAR(12),
    rating VARCHAR(10) NULL
);

INSERT INTO demo_bot VALUES
 (3,  20, 1, '첫 차로 얼마짜리를 사는 게 적당할까요?', 'DIRECT_INPUT', NULL,
     '월 소득과 고정 지출을 기준으로 보면, 차량 관련 월 비용이 소득의 15~20%를 넘지 않는 범위를 많이 권해요. 재무 진단을 해 보시면 내 조건에 맞는 가격대를 알려 드려요.', 'AI', 'LIKE'),
 (3,  20, 2, '서비스를 어떻게 이용하나요?', 'QUICK_QUESTION', 'service-overview',
     'CreditComPass에서는 첫 차 취향 테스트, 재무 진단, 차량 찾기와 차량 비교를 이용할 수 있어요.', 'FIXED', NULL),
 (4,  18, 1, '하이브리드는 무엇인가요?', 'QUICK_QUESTION', 'hybrid-electric',
     '하이브리드(HEV)는 엔진과 전기모터를 함께 사용하는 차예요.', 'FIXED', 'LIKE'),
 (4,  18, 2, '출퇴근 왕복 60km면 하이브리드가 이득일까요?', 'DIRECT_INPUT', NULL,
     '하루 60km면 한 달 약 1,300km라 연비 차이가 체감되는 편이에요. 차량 비교에서 월 유지비를 나란히 보시면 차액을 확인할 수 있어요.', 'AI', 'LIKE'),
 (6,  15, 1, '7인승 SUV 추천해 주세요', 'DIRECT_INPUT', NULL,
     '3열 시트가 있는 중대형 SUV를 추천 목록에서 승차 정원 7인 이상으로 거르시면 돼요.', 'AI', 'DISLIKE'),
 (6,  15, 2, 'MPV는 어떤 차인가요?', 'TERM_CLICK', 'MPV',
     'MPV는 Multi-Purpose Vehicle의 약자로, 여러 사람이 타거나 짐을 싣는 등 공간 활용을 중시한 다목적 차량이에요.', 'FIXED', NULL),
 (8,  12, 1, '전기차는 무슨 뜻인가요?', 'TERM_CLICK', 'ELECTRIC',
     '전기차(EV·BEV)는 배터리에 저장한 전기로 모터를 돌려 달리는 차예요.', 'FIXED', 'LIKE'),
 (8,  12, 2, '아파트에 충전기가 없으면 전기차는 힘들까요?', 'DIRECT_INPUT', NULL,
     '집 근처 공용 충전소 이용이 가능하다면 탈 수는 있지만, 충전 시간과 비용을 함께 고려하셔야 해요.', 'AI', NULL),
 (10, 10, 1, '경차는 무슨 뜻인가요?', 'TERM_CLICK', 'MINI',
     '경차는 국내에서 배기량과 차체 크기 등 법정 기준을 충족하는 작은 자동차 분류예요.', 'FIXED', NULL),
 (10, 10, 2, '경차 혜택이 뭐가 있어요?', 'DIRECT_INPUT', NULL,
     '경차는 취득세 감면, 통행료와 공영주차장 할인 같은 혜택이 있지만 요건과 시기에 따라 달라 구매 전 확인이 필요해요.', 'AI', 'LIKE'),
 (13, 8,  1, '차량을 비교하려면 어떻게 하나요?', 'QUICK_QUESTION', 'vehicle-compare',
     '추천 차량이나 차량 상세에서 비교할 차량을 최대 3대까지 추가한 뒤 상단의 차량 비교 메뉴를 열어 보세요.', 'FIXED', 'LIKE'),
 (13, 8,  2, '부부 공동명의로 사면 보험료가 달라지나요?', 'DIRECT_INPUT', NULL,
     '보험료는 피보험자 경력과 운전자 범위에 따라 달라져요. 정확한 금액은 보험사 견적으로 확인해 주세요.', 'AI', 'DISLIKE'),
 (17, 6,  1, '드림카를 사려면 얼마나 모아야 하나요?', 'DIRECT_INPUT', NULL,
     '드림카 플래너에서 목표 차량과 월 저축액을 입력하면 예상 기간을 계산해 드려요.', 'AI', 'LIKE'),
 (17, 6,  2, '취향 테스트 결과는 어떻게 저장하나요?', 'QUICK_QUESTION', 'taste-save',
     '로그인 후 취향 테스트의 8개 질문에 답하고 결과 화면에서 저장 버튼을 눌러 주세요.', 'FIXED', NULL),
 (22, 4,  1, '디젤은 무슨 뜻인가요?', 'TERM_CLICK', 'DIESEL',
     '디젤은 경유를 연료로 사용하는 엔진 방식을 뜻해요.', 'FIXED', NULL),
 (22, 4,  2, '장거리 위주면 디젤이 아직 나은가요?', 'DIRECT_INPUT', NULL,
     '고속 장거리 비중이 높으면 연비 면에서 유리할 수 있지만 차량 가격과 정비비, 선택 가능한 모델 수도 함께 비교해 보세요.', 'AI', NULL),
 (30, 2,  1, '차박하기 좋은 차 있어요?', 'DIRECT_INPUT', NULL,
     '2열을 접었을 때 바닥이 평평하고 길이가 180cm 이상 나오는 SUV나 미니밴이 차박에 많이 쓰여요.', 'AI', 'LIKE'),
 (30, 2,  2, '세단과 SUV는 어떻게 다른가요?', 'QUICK_QUESTION', 'sedan-suv',
     '세단은 대체로 차체가 낮고 객실과 트렁크가 나뉜 형태예요.', 'FIXED', NULL),
 (37, 1,  1, '전기차 보조금은 어떻게 받나요?', 'DIRECT_INPUT', NULL,
     '보조금은 지자체와 차종별로 달라요. 구매 계약 후 판매사를 통해 신청하는 경우가 일반적이에요.', 'AI', 'DISLIKE'),
 (38, 0,  1, '예상 월 유지비는 무슨 뜻인가요?', 'TERM_CLICK', 'RUNNING_COST',
     '예상 월 유지비는 차량을 이용하면서 한 달에 들 것으로 추산한 비용이에요.', 'FIXED', NULL);

INSERT INTO chatbot_conversations (user_id, created_at, updated_at)
SELECT m.user_id, NOW() - INTERVAL b.days_ago DAY - INTERVAL m.n MINUTE, NOW() - INTERVAL b.days_ago DAY - INTERVAL m.n MINUTE
FROM (SELECT DISTINCT member_n, days_ago FROM demo_bot) b
JOIN demo_seed_user m ON m.n = b.member_n;

INSERT INTO chatbot_messages (conversation_id, role, content, question_source, guide_id, created_at)
SELECT c.id, 'USER', b.question, b.question_source, b.guide_id, c.created_at + INTERVAL b.seq * 2 MINUTE
FROM demo_bot b
JOIN demo_seed_user m ON m.n = b.member_n
JOIN chatbot_conversations c ON c.user_id = m.user_id;

INSERT INTO chatbot_messages (conversation_id, role, content, reply_to_message_id, answer_type, provider, model, created_at)
SELECT q.conversation_id, 'ASSISTANT', b.answer, q.id, b.answer_type,
       IF(b.answer_type = 'AI', 'gemini', NULL), IF(b.answer_type = 'AI', 'gemini-3.5-flash-lite', NULL),
       q.created_at + INTERVAL 5 SECOND
FROM demo_bot b
JOIN demo_seed_user m ON m.n = b.member_n
JOIN chatbot_conversations c ON c.user_id = m.user_id
JOIN chatbot_messages q ON q.conversation_id = c.id AND q.role = 'USER' AND CAST(q.content AS BINARY) = CAST(b.question AS BINARY);

INSERT INTO chatbot_feedback (answer_message_id, rating, created_at, updated_at)
SELECT a.id, b.rating, a.created_at + INTERVAL 1 MINUTE, a.created_at + INTERVAL 1 MINUTE
FROM demo_bot b
JOIN demo_seed_user m ON m.n = b.member_n
JOIN chatbot_conversations c ON c.user_id = m.user_id
JOIN chatbot_messages q ON q.conversation_id = c.id AND q.role = 'USER' AND CAST(q.content AS BINARY) = CAST(b.question AS BINARY)
JOIN chatbot_messages a ON a.reply_to_message_id = q.id
WHERE b.rating IS NOT NULL;

UPDATE chatbot_conversations c
JOIN (SELECT conversation_id, MAX(created_at) AS last_at FROM chatbot_messages GROUP BY conversation_id) lm ON lm.conversation_id = c.id
JOIN demo_seed_user m ON m.user_id = c.user_id
SET c.updated_at = lm.last_at;

-- 5. 재무 진단 (개요의 진단 현황 · 모델 버전 기록) ------------------------------------------------------
-- 진단이 쓰는 모델 버전(DiagnosisMapper 와 같은 이름 · 라벨)이 없으면 만들고, 이전 버전 기록도 하나 둔다
INSERT IGNORE INTO model_versions (model_name, version_label, execution_type, description, created_at)
VALUES ('vehicle-candidate-recommender', 'candidate-v1', 'ML', '이전 후보 추천 모델 (데모)', NOW() - INTERVAL 40 DAY),
       ('vehicle-candidate-recommender', 'candidate-v2', 'ML', '차량 후보 추천 모델 (FastAPI)', NOW() - INTERVAL 20 DAY);

CREATE TEMPORARY TABLE demo_diagnosis (
    member_n INT,
    days_ago INT,
    version_label VARCHAR(50),
    monthly_available_amount DECIMAL(15, 2),
    recommended_price_max DECIMAL(15, 2)
);

INSERT INTO demo_diagnosis VALUES
 (3, 26, 'candidate-v1', 700000, 18000000), (4, 25, 'candidate-v1', 1100000, 28000000),
 (5, 24, 'candidate-v1', 1800000, 42000000), (6, 22, 'candidate-v1', 2100000, 48000000),
 (7, 21, 'candidate-v1', 500000, 15000000),  (9, 19, 'candidate-v2', 1500000, 36000000),
 (11, 17, 'candidate-v2', 1200000, 30000000), (13, 13, 'candidate-v2', 1600000, 39000000),
 (14, 13, 'candidate-v2', 800000, 21000000),  (15, 12, 'candidate-v2', 1400000, 34000000),
 (17, 11, 'candidate-v2', 600000, 17000000),  (19, 10, 'candidate-v2', 1300000, 32000000),
 (20, 9,  'candidate-v2', 900000, 24000000),  (21, 8,  'candidate-v2', 750000, 19000000),
 (24, 7,  'candidate-v2', 2300000, 52000000), (28, 6,  'candidate-v2', 950000, 25000000),
 (30, 5,  'candidate-v2', 1700000, 40000000), (32, 4,  'candidate-v2', 650000, 18000000),
 (6, 3,   'candidate-v2', 2000000, 46000000), (35, 3,  'candidate-v2', 1250000, 31000000),
 (37, 2,  'candidate-v2', 1100000, 29000000), (4, 1,   'candidate-v2', 1150000, 29000000),
 (38, 1,  'candidate-v2', 550000, 16000000),  (13, 0,  'candidate-v2', 1650000, 40000000);

CREATE TEMPORARY TABLE demo_snapshot_seed AS
SELECT d.*, m.user_id, NOW() - INTERVAL d.days_ago DAY - INTERVAL (d.member_n * 11) MOD 300 MINUTE AS diagnosed_at
FROM demo_diagnosis d JOIN demo_seed_user m ON m.n = d.member_n;

INSERT INTO input_snapshots (user_id, status_code, is_example, created_at, submitted_at)
SELECT user_id, 'SUBMITTED', FALSE, diagnosed_at, diagnosed_at FROM demo_snapshot_seed;

INSERT INTO analysis_runs (snapshot_id, model_version_id, status_code, monthly_available_amount, recommended_price_max, requested_at, completed_at)
SELECT s.snapshot_id, v.model_version_id, 'COMPLETED', d.monthly_available_amount, d.recommended_price_max, d.diagnosed_at, d.diagnosed_at + INTERVAL 2 SECOND
FROM demo_snapshot_seed d
JOIN input_snapshots s ON s.user_id = d.user_id AND s.created_at = d.diagnosed_at
JOIN model_versions v ON v.model_name = 'vehicle-candidate-recommender' AND CAST(v.version_label AS BINARY) = CAST(d.version_label AS BINARY);

-- 6. 차량 관리 상태 --------------------------------------------------------------------------------
-- 공개 차량만 있어 '작성 중 · 판매 종료 · 휴지통' 이 비어 보이므로, 기존 차량을 복사한 데모 차량을 상태별로 둔다.
-- 공개(PUBLISHED)가 아니므로 추천 카탈로그(/vehicles/recommendation-catalog)에는 나오지 않는다
INSERT INTO managed_vehicles (id, payload, status, version, updated_at)
SELECT CONCAT('demo-', p.id), JSON_SET(p.payload, '$.id', CONCAT('demo-', p.id), '$.memo', '관리자 화면 데모 차량'), s.status, 1,
       NOW(6) - INTERVAL s.days_ago DAY
FROM (SELECT id, payload, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM managed_vehicles WHERE status = 'PUBLISHED') p
JOIN (SELECT 1 AS rn, 'DRAFT' AS status, 1 AS days_ago
      UNION ALL SELECT 2, 'DRAFT', 2
      UNION ALL SELECT 3, 'DISCONTINUED', 5
      UNION ALL SELECT 4, 'DISCONTINUED', 9
      UNION ALL SELECT 5, 'DELETED', 3
      UNION ALL SELECT 6, 'DELETED', 12) s ON s.rn = p.rn;

INSERT INTO managed_vehicle_changes (vehicle_id, actor_id, previous_payload, next_payload, previous_status, next_status, created_at)
SELECT v.id, (SELECT user_id FROM demo_seed_user WHERE n = 1), NULL, v.payload, NULL, v.status, v.updated_at
FROM managed_vehicles v WHERE v.id LIKE 'demo-%';

DROP TEMPORARY TABLE demo_snapshot_seed, demo_diagnosis, demo_bot, demo_audit, demo_chat_feedback, demo_chat_message, demo_room, demo_member;
DROP TABLE demo_seed_user;
