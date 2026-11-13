# 콤파 챗봇 실행·운영

## 기능과 구조

로그인한 회원만 이용한다. 서비스 이용 / 차종 도감 / 자동차 용어 카테고리, 추천 질문, 취향 결과·차량 상세·재무 추천의 용어 설명 연결을 유지한다. 비회원에게는 챗봇과 설명 버튼을 표시하지 않는다.

추천 질문 9개와 사이트의 용어 설명 20개는 Spring에 등록한 고정 답변을 보여준다. 추천 질문과 용어가 같은 항목을 가리키면 같은 답변을 사용한다. 외부 AI를 호출하지 않아 토큰과 일일 AI 질문 횟수를 사용하지 않으며, API 키가 없거나 AI 질문 횟수를 모두 사용해도 이용할 수 있다. 답변은 `back/src/main/java/com/kh/back/chatbot/service/ChatGuideAnswers.java`에서 관리한다.

직접 입력한 질문은 React → Spring → 로컬 문서 검색 → 선택한 AI → 답변 순서다. 한국어 2글자 단위·단어로 상위 4개 문서 조각을 검색하며 벡터 DB나 ML 서버는 필요하지 않다. 고정 답변도 최근 대화에 저장하므로 이후 직접 입력하는 후속 질문에 맥락을 전달한다. 후속 AI 질문에서는 이전 고정 답변도 입력 토큰에 포함될 수 있다. 직접 입력한 문장이 추천 질문과 같더라도 AI로 처리한다.

## 모델 선택과 키

기본값은 기존 Gemini 연결이다. OpenAI를 사용하려면 실행할 PowerShell에서 설정하고 기존 Spring 서버를 종료한 뒤 다시 실행한다. 실제 키는 소스·React VITE 변수·Git에 넣지 않는다.

```powershell
cd C:\workspace\Spring
$env:CHATBOT_PROVIDER = 'openai'
$env:OPENAI_MODEL = 'gpt-5.6-luna'
$chatbotSecret = Read-Host 'OpenAI API 키' -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new('', $chatbotSecret).Password
.\dev.ps1
```

환경변수 대신 프로젝트 루트 `.env.local`(`.env.example` 복사)에 같은 이름으로 적어도 된다. 이 파일이 환경변수보다 우선하며 값이 빈 줄은 무시된다. 파일 내용 바꾼 뒤에도 Spring 서버를 다시 켜야 적용된다.

Windows 사용자 환경변수로 설정했다면 IDE·터미널을 완전히 닫았다가 다시 연다. dev.ps1은 켜진 서버를 재사용하므로 기존 서버를 종료한 후 실행해야 새 의존성과 키가 적용된다.

Gemini: CHATBOT_PROVIDER=gemini, GEMINI_API_KEY, GEMINI_MODEL(기본 gemini-3.5-flash-lite).
OpenAI: CHATBOT_PROVIDER=openai, OPENAI_API_KEY, OPENAI_MODEL. 모델은 해당 키에 허용된 이름을 지정한다. 자동 제공자 전환은 아직 하지 않는다.

OpenAI는 Spring AI 2.0.2 ChatClient를 사용한다. ChatMemory는 두 제공자에서 사용하는 서버 측 최근 10개 메시지 창이다. 실패한 요청이 반쪽 대화로 저장되지 않도록 서비스에서 성공한 질문·답변 쌍만 추가하며, 이중 저장을 피하기 위해 자동 메모리 Advisor는 붙이지 않는다. 외부 요청은 30초 제한, SDK 자동 재시도 0회·Spring AI 최대 시도 1회다. 키가 없어도 서버·이력 조회는 작동하고 질문 전송만 503으로 안내한다.

## 기록·사용량·개인정보

- 회원 번호는 JWT 인증 주체에서만 가져온다. 클라이언트가 보낸 회원 번호·대화 이력은 사용하지 않는다.
- 질문 1~500자, 회원별 한국 시간 자정 기준 하루 30회, 서버 동시 외부 호출 4개까지다. 외부 호출 단계에 진입한 실패도 차감한다. 입력 오류·키 없음·동시 요청 거절은 차감하지 않는다.
- 정상 완료된 질문·답변은 고정 안내를 포함해 MySQL에 저장한다. 직접 입력 / 추천 질문 / 용어 클릭을 구분하고, 당시 답변 본문과 고정 안내 항목 또는 AI 제공자·모델을 함께 기록한다. 서버 재시작 후에도 대화와 평가는 남는다. DB 저장 이전의 메모리 대화는 소급 복원하지 않는다.
- 사용자 화면은 현재 대화의 최근 메시지 20개부터 보여주고 ‘이전 대화 보기’로 더 불러온다. AI 맥락은 DB에서 최근 메시지 10개만 가져오며, 화면에 과거 기록을 펼쳐도 모델에 전체 대화를 보내지 않는다.
- ‘새 대화 시작’은 기존 대화를 종료 표시하고 새 대화로 전환한다. 기존 질문·답변·평가는 DB에 남아 관리자가 조회할 수 있다. 새 대화에는 이전 대화 맥락을 전달하지 않는다. 일일 질문 횟수는 초기화하지 않는다. 사용 횟수는 기존처럼 메모리 기준이므로 서버 재시작 시 초기화된다.
- 좋아요·싫어요는 본인이 받은 콤파 답변에만 남길 수 있다. 답변당 평가 하나를 유지하며 반대 평가로 변경하거나 같은 버튼을 다시 눌러 취소한다. 사유·의견 입력은 없다. 평가는 AI를 호출하거나 질문 횟수를 차감하지 않는다.
- 관리자 `/console?tab=chatbot`에서 질문·답변을 게시글 목록 형태로 조회한다. 질문 내용 / 회원 닉네임 부분 일치 검색과 전체 / 좋아요 / 싫어요 / 평가 없음 필터를 함께 적용한다. 페이지당 20건, 전체 건수와 페이지 번호 이동을 제공하며 질문 또는 보기를 누르면 답변 상세와 대화 맥락을 확인한다. 상담원 1:1 상담과 별도다. 새 테이블은 V25의 `chatbot_conversations`, `chatbot_messages`, `chatbot_feedback`이다. 기존 Elasticsearch·상담 연동은 변경하지 않는다.
- 자동 보관 기한·일괄 삭제·관리자 검토 상태·답변 편집 기능은 추가하지 않는다. 회원 탈퇴 시 새 테이블의 기록은 외래키 CASCADE로 함께 삭제된다. 대화 저장과 관리자 열람 가능성은 콤파 정보 아이콘에서 안내한다.
- 주민번호·카드번호·전화번호·계좌번호·이메일은 검색·전송·기록 전에 가리고 답변도 가린다. 원문 질문을 대화 기록에 넣지 않는다. 이름·주소·변형 입력을 정규식으로 모두 검출할 수 없어 화면에도 입력 금지를 안내한다.
- 시스템 지침은 DB의 chatbot_prompt_versions에서 현재 적용된 버전의 본문을 읽는다. 관리자에서 새 버전을 등록하고 적용한다. 기존 chatbot-system.st 파일은 삭제했으며, 답변 지침은 모델 준수를 보장하는 필터는 아니다.
- OpenAI에는 현재 회원의 최근 진단 중 월 여유금·구매 가격 상한과 저장된 취향 이름만 요약한다. 이름·연락처·계좌·원본 응답은 포함하지 않는다. 무료 Gemini에는 이 개인 요약을 자동 첨부하지 않는다.

## API

모든 요청은 로그인 필요. 기존 /api/v1/chat-messages와 ApiResponse 봉투를 유지한다.

- POST: { "message": "MPV란?" } → data: { answer, question, remaining, sources, questionId, answerId }. question은 가린 질문이며 화면은 이것을 표시한다.
- POST /api/v1/chat-messages/guides: { "guideId": "MPV", "source": "QUICK_QUESTION" 또는 "TERM_CLICK" } → 같은 응답 구조로 고정 질문·답변을 기록한다. source 생략은 QUICK_QUESTION. 등록되지 않은 ID는 400이며 외부 AI 호출로 대체하지 않는다. remaining은 차감하지 않는다.
- GET ?beforeId=메시지번호: data: { messages: [{ id, role: "user" 또는 "model", text, rating }], remaining, hasMore }. 현재 대화의 메시지 20개를 시간순으로 반환한다. beforeId 생략 시 최근 페이지.
- DELETE: 기존 대화를 종료하고 새 대화로 전환한다. DB 기록·평가·사용량을 삭제하지 않는다.
- PUT /api/v1/chat-messages/{answerId}/feedback: { "rating": "LIKE" 또는 "DISLIKE" }. 평가 저장·변경, 204.
- DELETE /api/v1/chat-messages/{answerId}/feedback: 평가 취소, 204. 다른 회원의 답변이나 사용자 질문이면 404.
- GET /api/v1/admin/chatbot-exchanges?rating=ALL|LIKE|DISLIKE|UNRATED&page=0&keyword=질문내용또는닉네임: 질문·답변 묶음 20개와 hasMore, page, total, totalPages, ratingCounts(likes/dislikes/unrated). 집계는 현재 검색 조건 전체를 기준으로 하며 페이지·정렬에 영향받지 않는다. keyword는 최대 50자, 평가와 질문·닉네임 검색 조건을 함께 적용한다. 목록에 userName(회원 닉네임)과 number(검색 결과 내 번호)를 포함한다. sort는 number/question/member/source/answer/rating/createdAt, direction은 ASC/DESC이며 정렬은 전체 검색 결과에 적용한 뒤 페이징한다. sort가 없으면 최신순이다. ADMIN·SUPER_ADMIN만 가능.
- GET /api/v1/admin/chatbot-conversations/{id}/messages?beforeId=메시지번호: 관리자용 대화 맥락 20개. 콤파의 새 관리자·평가 컨트롤러 업무 오류는 application/problem+json으로 반환한다.

400 입력 오류, 401 로그인 필요, 429 동시 요청 또는 일일/제공자 한도, 503 키 없음 또는 OpenAI 연결 실패. Gemini 키·모델·응답 오류는 502, 전송 지연은 504. 내부 예외 내용·질문 원문·키를 오류 응답이나 챗봇 로그에 기록하지 않는다.

## 자료와 검증

안내 문서: back/src/main/resources/chatbot/knowledge/*.md. 제목 단위와 최대 1,200자 조각으로 나눠 검색한다. 수정 뒤 서버를 재시작한다. 검색 자료 목록은 모델에게 전달한 자료이며 실제 인용 여부를 검증한 출처는 아니다. UI에는 노출하지 않는다.

실제 답변은 [검증표](chatbot-evaluation.md)의 20개 질문을 모델별로 실행해 기록한다. 자동화 테스트의 가짜 응답 성공과 실제 모델의 사실 정확성을 구분한다.
