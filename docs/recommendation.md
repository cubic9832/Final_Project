# 차량 추천 실행과 API

현재 구현은 `ml/vehicle_matching`, 모델은 `ml/outputs/models/candidate-preferences/20261027-seating-verified-v1`이다. 설치·재학습은 [ML 안내](../ml/README.md)를 따른다.

루트 `dev.ps1` 또는 `./ml/serve-candidates.ps1`로 8002 서버를 실행한다. 프런트엔드 Vite의 `/api/v2` 프록시는 이 서버로 요청을 보낸다. 배포 시에도 동일 경로를 추천 API로 전달해야 한다.

- `POST /api/v2/recommendations`: `{profile: {...}, k: 3}`. 프로필 예시는 `ml/examples/candidate-profile.json`이다.
- `GET /api/v2/recommendation-options`: 후보·입력·정책 정보.
- 요청 스키마와 응답 상세는 서버 `/docs`와 `ml/vehicle_matching/api.py`를 따른다.
- 실패는 HTTP 상태 코드와 `application/problem+json`을 사용한다.

현재 모델은 합성 비교 정답을 학습했다. 재무 조건과 필수 정원·선호 중요도 및 ML 점수를 사용하며 점수는 구매·만족 확률이 아니다.

구형 v1 문서는 [작업 기록](../ml/legacy/history/recommendation-v1.md)에 보관했다. v1 서버는 기본 개발 실행에 포함하지 않는다.


## 로그인 회원 추천 입력 보관

회원별 최신 입력은 `user_recommendation_inputs`(Flyway V43)에 보관한다. 각 질문의 다음 버튼과 최종 추천 실행 전에 저장하며, 추천 화면 진입 시 계정의 저장값을 조회한 후 현재 탭의 초안을 우선하여 복원한다. 추천 결과와 화면 이동 상태는 DB에 저장하지 않는다. 비회원은 탭 초안만 유지한다.

- `GET /api/v1/members/me/recommendation-inputs`: 저장값 또는 `data: null`.
- `PATCH /api/v1/members/me/recommendation-inputs`: `{ version, financialInputs?, vehiclePreferences? }`. 최초 생성은 `version: 0`, 이후 응답의 최신 버전을 전달한다. 전달한 영역 전체를 교체하고 생략한 영역은 유지한다. 영역 안의 명시적 `null`은 미선택으로 보존한다.
- 금액 문자열은 만 원 단위이며 빈 문자열과 0을 구분한다. 대출 월 상환액은 계산 결과의 소수점 4자리까지 유지한다.
- 성공 응답은 `{ success: true, data: { financialInputs, vehiclePreferences, schemaVersion: 1, version } }`이고 버전 충돌은 `409`이다. 입력 오류는 `400` Problem Details의 `errors: [{ field, message }]`로 전달한다.
- 소유자는 인증된 회원 ID로만 결정한다. 계정 전환 시 요청을 취소하고 로컬 입력을 비운다. 회원 탈퇴 시 저장 입력을 삭제하며 저장과 탈퇴는 동일한 회원 행 잠금으로 순서를 보장한다.
- 조회 실패는 재시도 또는 새 입력 시작을 제공한다. 저장 실패는 입력을 유지하며, 충돌 시 최신 저장값 복원 또는 현재 입력 유지 후 재저장을 선택한다.
