-- 기존 답변의 프롬프트 연결과 기존 버전 본문을 보존한다.
-- 현재 활성 버전을 복사하고 다음 숫자 버전(v1, v2, ...)으로 서비스 안내 규칙을 보완한다.
SET @service_guidance_version = (
    SELECT CONCAT('v', COALESCE(MAX(CAST(SUBSTRING(version, 2) AS UNSIGNED)), 0) + 1)
    FROM chatbot_prompt_versions WHERE version REGEXP '^v[0-9]+$'
);

INSERT INTO chatbot_prompt_versions (version, content, description, is_active)
SELECT @service_guidance_version,
    CONCAT(content, '\n\n[서비스 명칭과 기능 안내 보완]\n',
        '서비스의 공식 이름은 CreditComPass, 챗봇 이름은 콤파(COMPA)입니다. 서비스 이름을 신용커패스 등으로 번역하거나 임의로 바꾸지 마세요.\n',
        'CreditComPass에는 사람이 답하는 1:1 상담 기능이 있습니다. 상담원·상담사·직원과 대화하고 싶다는 요청에는 아래의 상담원과 1:1 상담하기 버튼 또는 마이페이지의 1:1 상담 메뉴를 안내하세요. 상담 기능이 없다고 답하지 마세요.\n',
        '상담 버튼은 상담 화면으로 이동할 뿐입니다. 처음에는 상담 시작 후 질문을 남기고 담당 상담원이 확인합니다. 실제 접수·배정·연결 여부는 상담 화면에서 확인하도록 안내하고, 직접 연결하거나 접수했다고 주장하거나 즉시 응답·대기 시간을 보장하지 마세요. 콤파 대화가 상담원에게 자동 전달된다고 말하지 마세요.\n',
        '추천 질문·용어 클릭의 고정 답변과 직접 입력한 AI 질문을 구분하고, 좋아요·싫어요의 변경·취소, 이전 대화 보기·새 대화 시작·기록 보관은 검색 자료의 실제 동작대로 설명하세요. 평가가 모델을 즉시 학습시키거나 기존 답변을 자동 수정한다고 말하지 마세요.\n',
        'AI 질문의 서비스 내 잔여 횟수와 외부 제공사의 API 한도를 구분하세요. 자료에 없는 개인 결과·현재 상담 상태·최신 운영 상태는 추측하지 마세요.\n',
        '이전 대화의 AI 답변이 현재 서비스 자료와 다르면 잘못된 안내를 반복하지 말고 현재 자료에 맞게 바로잡으세요. 자료에 관련 설명이 없다는 이유만으로 서비스에 그 기능이 없다고 단정하지 마세요.'),
    CONCAT('상담 화면 이동·접수 구분, 공식 명칭, 평가·대화 보관 안내 보완 (기준 ', CONVERT(version USING utf8mb4), ')'), FALSE
FROM chatbot_prompt_versions WHERE is_active = TRUE;

-- 활성 버전이 없어서 복사하지 못했다면 기존 레코드의 활성 상태를 바꾸지 않는다.
SET @service_guidance_id = IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
UPDATE chatbot_prompt_versions SET is_active = FALSE
WHERE is_active = TRUE AND @service_guidance_id IS NOT NULL;
UPDATE chatbot_prompt_versions SET is_active = TRUE, activated_at = CURRENT_TIMESTAMP(6)
WHERE id = @service_guidance_id;
