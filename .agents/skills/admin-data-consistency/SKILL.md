---
name: admin-data-consistency
description: 관리자 화면의 데이터 조회·표시·집계·저장 흐름을 구현하거나 정합성을 점검할 때 하드코딩·예시 데이터의 사용 여부를 확인하고 UI·API·DB·실행 중인 ML의 원본과 값을 대조해 불일치를 수정한다. 순수 색상·여백 변경에는 전체 데이터 감사를 수행하지 않는다.
---

# 관리자 데이터 정합성

운영 현황, 차량·추천·회원 관리, 1:1 상담, 콤파 대화·평가, 모델 관리, 운영 로그에서 표시하는 값이 해당 업무의 실제 원본을 정확히 반영하게 한다. 스킬 생성·호출 자체를 데이터 변경이나 서버 재시작의 승인으로 해석하지 않는다.

## 원본을 먼저 정한다

작업 폴더와 브랜치, 미커밋 변경을 확인하고 요청 범위의 화면부터 추적한다. 전체 관리자 감사를 요청받으면 `AdminPage.jsx`의 실제 메뉴를 기준으로 빠짐없이 목록을 만든다. 아래 화면별 원본 지도를 출발점으로 사용하되 현재 코드를 다시 확인한다.

각 표시값을 `화면/항목 → 프런트 변환 → 실제 API → Service·Mapper·Repository → DB 테이블/조건 또는 다른 원본`으로 연결한다. 목록, 상세, 합계, 배지, 차트, 이미지, 상태 문구를 포함한다. 주석의 설명보다 실행되는 코드를 근거로 한다.

- 회원·관리 차량·대화·평가·운영 기록은 저장된 DB 행과 비교한다. 마이그레이션으로 적재된 데이터도 DB 데이터이며 화면에 하드코딩한 예시와 구분한다.
- 모델 평가·학습 이력, 실행 모델 정보, 서비스 상태, 이미지 파일은 DB 외 원본이 정당할 수 있다. 원본을 명시하고 해당 파일·프로세스·연결 상태와 비교한다. 정합성을 이유로 불필요한 DB 테이블을 만들지 않는다.
- 화면이 현재 추천 후보라고 설명하면 학습 당시 `catalog.json`이 아니라 **실행 중인 추천 서버가 실제 사용하는 후보**와 ID·주요 제원을 대조한다. 학습 기록 화면의 과거 스냅샷은 현재 후보와 구분해 유지한다.

## 하드코딩·예시 데이터 확인

관리자 화면이 표시하는 업무 값에 고정 숫자, 샘플 배열, 목업 응답, 실패 시 대체 데이터가 섞여 있는지 검색하고 실제 호출 경로를 추적한다. 파일명에 Example·Sample이 있다는 사실만으로 화면 사용을 단정하지 않는다.

- **실제 사용 여부:** import·재노출·동적 로딩과 렌더링까지 확인해 사용 중인 예시와 미사용 잔여 파일을 구분한다. 현재 API 응답을 무시하고 고정 목록·통계를 표시하는지 점검한다.
- **정당한 고정값:** 메뉴명, 상태 코드 번역, 선택지, 입력 기본값, 단위, UI 레이아웃은 업무 데이터의 하드코딩과 구분한다. DB 마이그레이션으로 적재된 시드와 학습 결과 파일도 화면에만 있는 가짜 데이터로 취급하지 않는다.
- **실패 은폐:** 조회 오류를 고정 숫자·예시 목록·0건·‘정상’으로 대신 표시하는 경로를 확인한다. 로딩·실패·실제 빈 결과를 구분한다.
- **결과:** 발견한 고정 업무 값마다 파일·표시 항목·실제 사용 여부·의도된 원본을 보고한다. 검증 범위를 명시하고 ‘하드코딩 없음’을 전체 화면에 근거 없이 일반화하지 않는다. 확인 요청만으로 미사용 파일을 삭제하지 않는다.

## 같은 조건으로 비교한다

실제 DB 스키마와 SQL, 요청·응답 DTO를 확인하고 가능한 경우 같은 시점의 읽기 전용 DB 조회와 API 응답을 대조한다. 관리자 인증은 정상 경로를 사용하며 검증을 위해 인증을 해제하거나 타인 토큰을 가져오지 않는다.

- **목록·상세:** 안정적인 ID로 비교한다. 이름만 같거나 건수만 같은 것을 일치의 증거로 삼지 않는다. 검색, 공개·삭제 상태, 권한별 범위, JOIN 중복, NULL 처리도 맞춘다.
- **집계:** 행/트림 수, 브랜드+모델 중복 제거 수, 회원 수, 질문·답변 쌍 수의 단위를 구분한다. 현재 검색 결과 기준인지 전체 기준인지 UI와 계산을 일치시킨다. 페이지에 보이는 행만 세어 전체 건수로 표시하지 않는다.
- **검색·정렬·페이징:** 전체 대상에 검색·정렬한 뒤 페이지를 나눈다. 목록과 COUNT는 같은 조건을 사용한다. 동점 보조 정렬을 두고 첫·중간·마지막 페이지, 빈 결과를 확인한다. Java `PageMeta`와 API별 0/1 시작 차이는 어댑터에서 명확히 처리하고 기존 계약을 임의로 바꾸지 않는다.
- **표현:** DB 원 단위와 화면 만 원/억 단위, 소수 정밀도, 날짜·시각과 한국 시간, 상태 코드의 한글 표시를 확인한다. DB 변경 이력 버전은 적용 완료된 최고 버전으로 비교하며 마지막 실행 순서나 문자열 정렬을 최고 버전으로 오인하지 않는다. 최고 번호만으로 누락·체크섬 검증 통과를 단정하지 않는다. 미입력을 0으로 바꾸지 않고 실패·로딩·정상 0건을 구분한다. 이미지 매핑·기본 이미지도 출처를 확인한다.
- **저장·권한:** 입력 길이와 수치 형식을 서버 제약·실제 저장 구조에 맞춘다. 재조회 후 목록·상세·집계가 같은 값을 보이는지 확인한다. 관리자/총관리자 권한 차이, 삭제·복구·공개 상태와 수정 버전 충돌을 유지한다.

## 실행 환경까지 확인한다

로컬·팀 PC·원격 서버와 연결 DB를 구분한다. 프런트 프록시, Spring 주소, ML 주소, 실행 모델 경로, 컨테이너 환경변수·시작 시각을 현재 설정에서 확인한다. 이전 대화의 주소나 건수를 고정된 정상값으로 사용하지 않는다.

추천 연동은 `DB 공개 차량 ID 집합 → Spring recommendation-catalog → ML의 catalogSource·후보 목록/실제 추천 → 프런트가 호출하는 경로`로 확인한다. 로컬 코드가 최신이어도 오래 실행 중인 프로세스가 예전 목록을 사용할 수 있다. 같은 프로세스의 최신 원본과 비교하고, 단순 건수 일치로 실시간 연동을 확정하지 않는다.

- DB와 ML이 별도 프로세스이면 미커밋 트랜잭션을 ML에서 읽을 수 없다. 상태 전이 검증이 필요하고 승인 범위에 포함되면 기존 차량 대신 식별 가능한 임시 행을 사용하고 종료·실패 시 자기 행만 정리한다.
- 작성 중·검수 대기·판매 종료·삭제는 추천에서 제외되고 공개만 포함되는지, 다음 추천 요청에 반영되는지 확인한다. DB 조회 실패 시 오래된 후보로 조용히 대체하지 않는다.
- 서버가 꺼졌거나 접근 권한이 없으면 검증하지 못한 구간을 명시한다. 화면 접속·소스 존재만으로 원격 실행 버전이나 연동 성공을 단정하지 않는다.

## 불일치 수정과 검증

조회 조건·응답 매핑·단위 변환·화면 집계 등 원인을 고쳐 같은 검증을 반복한다. 숫자를 맞추려고 원본 DB를 임의로 수정하거나 정상 공개 차량을 숨기지 않는다. 하드코딩으로 API 실패를 감추지 않는다. 확인만 요청받았다면 원인과 수정 범위를 설명하고 실행 설정·데이터는 변경하지 않는다.

Elasticsearch와 1:1 상담 연동은 조회·추적할 수 있지만 핵심 연동 수정이 필요하면 먼저 사용자에게 설명하고 확인한다. 기존 실행·중지 방식을 유지하고 Spring·프런트를 숨겨서 실행하지 않는다. 로컬 환경 설정은 공용 코드와 분리한다. DB 초기화, Flyway 이력 변경, 컨테이너 재생성은 정합성 검사의 자동 단계로 삼지 않는다.

변경한 데이터 흐름에 맞춰 실제 오류를 발견할 수 있는 조회·저장·집계 테스트를 실행한다. 기존 기록을 보존하고 새 테스트·개인 설정·스킬 파일은 별도 요청 없이 커밋하지 않는다.

완료 시 다음을 간단히 보고한다.

- 화면/항목, 실제 원본, 비교한 동일 조건, 일치·불일치·검증 불가 결과.
- 불일치 원인과 수정한 파일/설정, 검증 결과와 남은 제한.
- 임시 데이터 정리 여부, DB·서버 상태를 변경했는지 여부.

핵심 항목은 근거 파일·API·쿼리 또는 실행 결과를 함께 제시한다. 검증하지 않은 화면을 포함해 전체가 일치한다고 보고하지 않는다.

## 화면별 원본 지도

경로는 프로젝트 루트 기준이다. 이 지도는 최초 탐색 위치이며 현재 구현을 대신하지 않는다. 메뉴는 `front/src/pages/admin/AdminPage.jsx`, 일반 관리자 API 클라이언트는 `front/src/features/admin/adminApi.js`에서 확인한다.

| 화면 | 데이터 경로와 대조 원본 |
|---|---|
| 운영 현황 | `AdminOverviewPanel.jsx` → `/admin/overview`, `/admin/members/summary`, `/admin/system-status`, `/admin/system-status/mail`, 차량 API, `/api/v2/recommendation-options`, 운영 로그. `users`, `user_profiles`, `analysis_runs`, `input_snapshots`, `admin_audit_logs`와 각 실행 서비스 상태를 구분한다. 차량 요약이 공개 차량 API를 읽는 경우 관리 차량 전체와 건수가 다른 이유를 표시 범위와 함께 확인한다. |
| 차량 관리 | `AdminVehiclesPanel.jsx`, `vehicles/adminVehicleApi.js` → `/admin/vehicles` → `back/src/main/java/com/kh/back/admin/vehicle/AdminVehicleRepository.java` → `managed_vehicles.payload` JSON와 `status`, `version`. 변경 기록은 `managed_vehicle_changes`. 입력 제약은 `AdminVehicleRequest.java`와 Service를 확인한다. 화면 `price`는 만 원, 저장 `priceWon`과 JSON `price`는 원이다. 현재 검색 범위의 모델·국산·수입 집계를 비교한다. |
| 실제 추천 후보 | `/api/v1/vehicles/recommendation-catalog` → `PublishedVehicleCatalogController` → `AdminVehicleRepository.published()`의 공개 상태 조회. `ml/vehicle_matching/api.py`, `managed_catalog.py`가 매 추천 요청에 사용하는 출처·ID 집합을 확인한다. 실행 옵션 응답 `catalogSource=managed-database`도 점검하되 이것만으로 정합성을 확정하지 않는다. |
| 추천 관리 | `AdminRecommendationsPanel.jsx` → `/admin/recommendation-candidates` → `AdminModelServiceImpl.getCandidates()`. 현재 구현은 학습 결과 경로의 `catalog.json`을 읽는다. 화면의 ‘추천 서버가 실제로 고르는 후보’ 설명과 실행 중 DB 카탈로그가 다를 수 있으므로 우선 점검한다. `candidateModelImages`의 모델별 이미지가 저장된 차량 이미지와 다른 원본이라는 점도 확인한다. |
| 회원 관리 | `AdminMembersPanel.jsx` → `/admin/members`, `/admin/members/summary` → `AdminMemberServiceImpl`, `mappers/AdminMemberMapper.xml`. `users`, `user_profiles`, `social_accounts`, `refresh_token`, `admin_accounts` 등 실제 JOIN과 CurrentRoleLookup을 확인한다. 권한, 로그인 잠금, 계정 정지는 서로 다른 상태다. |
| 1:1 상담 | `AdminChatPanel.jsx`, `features/chat/` → 실제 상담 API·WebSocket과 `mappers/ChatMapper.xml`. `chat_room`, `chat_message`, `chat_feedback`, `chat_quick_reply`의 방·메시지·평가 단위를 구분한다. 읽기 전용 추적을 우선하고 통신 연동 자체를 임의로 수정하지 않는다. |
| 콤파 대화·평가 | `AdminChatbotPanel.jsx`, `features/chatbot/chatApi.js` → `/admin/chatbot-exchanges`, `/admin/chatbot-conversations/{id}/messages` → `chatbot/repository/ChatHistoryRepository.java`. `chatbot_conversations`, `chatbot_messages`, `chatbot_feedback`, 회원 닉네임 JOIN. 목록 한 건은 질문+답변 한 쌍이며 좋아요·싫어요·평가 없음은 답변 기준이다. 현재 검색 전체 집계를 페이지 이동 전 결과와 대조한다. 상담원 채팅과 혼동하지 않는다. |
| 모델 관리 | `AdminModelsPanel.jsx` → `/admin/model-report` → `AdminModelServiceImpl`, `mappers/AdminModelMapper.xml`. 학습 지표·실험 이력은 모델 결과 파일, 버전별 진단 기록은 `model_versions`와 `analysis_runs`. 학습에 사용한 스냅샷과 현재 런타임 모델을 구분한다. |
| 운영 로그 | `AdminLogsPanel.jsx` → `/admin/audit-logs` → `AdminAuditLogServiceImpl`, `mappers/AdminAuditLogMapper.xml` → `admin_audit_logs`와 회원 JOIN. 작업자·대상·시각·종류를 비교하고 탈퇴 회원의 NULL을 처리한다. |

### 환경 확인 위치

- `front/vite.config.js`: 브라우저 `/api/v2`가 어느 ML로 전달되는지 확인.
- `dev.ps1`, `dev.sh`, `ml/serve-candidates.ps1`: 실제로 어떤 앱을 시작·재사용하는지 확인. 스크립트가 있다는 사실과 실행 중 프로세스는 별개다.
- Docker를 사용하는 로컬 PC에서는 Compose labels의 `config_files`와 해당 서비스 환경변수를 확인. `tmp/ml-compose.local.yml`은 있을 때만 사용하는 로컬 설정이며 다른 환경에 복사하지 않는다.
- ML만 Docker에 있으면 호스트 Spring 주소가 필요하고, 양쪽을 같은 호스트에서 직접 실행하거나 별도 Docker 네트워크에서 실행하면 주소가 다르다. 주소를 고정하지 말고 해당 환경을 확인한다.
- DB 비밀번호·토큰은 보고서·스킬·코드에 기록하지 않는다. 외부 공개 조회 API와 정상 관리자 인증 경로를 우선 사용한다.
