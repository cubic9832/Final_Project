# 차량 사양 보완 (2026-11-04)

공개 추천 차량 381건 중 전장 누락 39건과 좌석 누락 25건을 보완한다.
`manifest.json`은 ID·브랜드·모델·트림·가격·연료·원본 URL, 변경 전 값,
보완 값과 제조사 출처를 함께 기록한다. 가격과 공개 상태는 변경하지 않는다.
검수 대기 3건은 추천 대상에 추가하지 않는다.

- 스타리아 LPG 카고: 원본 가격 3,259/3,412만 원에 해당하는 3인승.
- 스타리아 하이브리드 카고: 3,625/3,745만 원에 해당하는 2인승.
- 스타리아 하이브리드 투어러: 동일 가격의 9·11인승 구성. 기본 구성은 9인승.
- 스타리아 라운지 일렉트릭: 6,359만 원에 해당하는 7인승.
- 카니발 및 하이리무진: 원본 가격표의 기본사양 연결에 해당하는 9인승.
- 아이오닉 9: 원본 가격표의 6,759/7,325만 원에 해당하는 7인승.
- 더 뉴 아이오닉 6: 기본형 4,925mm, N Line 4,935mm를 구분한다.

V38 마이그레이션은 ID뿐 아니라 원본 식별 정보와 변경 전 값을 비교하며
관리자가 수정한 값은 덮어쓰지 않는다. 이미 적용된 Flyway 파일은 수정하지 않는다.

재생성은 프로젝트 루트에서 실행한다. 출력 폴더는 존재하지 않아야 한다.

```powershell
ml/.venv/Scripts/python.exe tools/data/vehicles/build_reviewed_specifications.py --source ml/outputs/models/scenario-choices/20261103-unified-managed-3m --manifest data/vehicles/specification-completion-20261104/manifest.json --output ml/outputs/models/scenario-choices/20261104-specifications-completed --migration back/src/main/resources/db/migration/V38__complete_missing_vehicle_specifications.sql
```

기존 DB 학습 스냅샷과 모델 디렉터리는 그대로 보존한다. 새 디렉터리는 사양 보완용
서빙 번들이다. 원래 학습 가중치를 재사용하며, 재학습 결과로 간주하지 않는다.
원본 학습 지표와 보완 후 DB 일치·서빙 검증의 범위를 구분한다.
