# 공통 차량 카탈로그

2026-11-03부터 차량 원본은 `managed_vehicles`다. 차량 조회·검색·관리자·성향 테스트·드림카가 같은 DB와 문자열 ID를 사용한다. 일반 차량 화면은 지원하는 비용 계산에 맞춰 가솔린·하이브리드와 유효한 연비를 필터링한다. 이 화면 필터는 별도 원본 데이터가 아니다.

## 통합 결과

- 기존 관리 차량 311건 + 모델 전용 39건 + 구형 DB에서 동일 사양으로 확정되지 않은 34건 = 384개 사양.
- 공개 381건, 검토 3건. 검토 상태를 임의로 공개하지 않는다.
- 구형 `vehicles` 258개 ID는 `data/vehicles/unified-managed-20261103/legacy_mapping.json`에 모두 보존한다.
- 가격·연식·연료·정규화한 트림이 모두 같은 유일한 후보만 병합했다. 다른 가격이나 불명확한 사양은 삭제하지 않고 별도 ID로 보존했다.
- V26: 데이터 통합. V27: 성향 차량 연결 10건을 공통 ID로 옮기고 구형 테이블 제거. V28: 관리자 부가 정보 보완.

제거한 테이블: `vehicles`, `brands`, `favorite_vehicles`, `purchase_plans`, `recommendations`, `simulations`, `vehicle_preferences`, `analysis_factors`. 회원 진단 요약(`input_snapshots`, `financial_profiles`, `analysis_runs`, `model_versions`)과 관리자 변경 이력은 유지한다. 관심 차량·드림카 계획의 사용자 저장 방식은 기존 브라우저 저장을 유지한다.

## 학습과 서빙

모델: `ml/outputs/models/scenario-choices/20261103-unified-managed-3m`.

DB 전체 384개 ID와 `catalog.json`의 모든 `Vehicle` 필드는 일대일로 일치한다. 관리자 메모·구형 ID·출처 표시명처럼 ML이 소비하지 않는 부가 필드는 DB에만 있을 수 있다. `database_verification.json`은 실제 DB 대조 결과다.

검토 3건은 `recommendation_enabled=false`로 파일에 보존하되 합성 학습 후보·추천에서 제외한다. 공개 381사양으로 사용자 396,746개·비교쌍 3,000,000개를 생성하고 30 epochs를 학습했다. holdout 정확도 69.3108%, log loss 0.555291이며 합성 선택 예측 성능이다. 선형 기준 모델보다 우수하다는 결과는 아니다.

미수집 전고·디자인·가속 특성에는 근거에 명시된 추정·중립값을 사용한다. 공식 측정값으로 표시하지 않는다. 수소차는 km/kg 및 개발용 13,000원/kg 가정으로 계산하며 실시간 가격이 아니다.

DB 변경을 기존 가중치에 임의로 적용하지 않는다. 서빙 시 공개 DB 카탈로그와 학습 스냅샷을 비교하며 불일치하면 503과 재학습 안내를 반환한다. 검사 캐시의 최대 지연은 5초다. 관리자 변경이 커밋되면 Elasticsearch 인덱스도 갱신한다.

원본 스냅샷 구성은 `tools/data/vehicles/unify_managed_catalog.py`, 데이터 생성은 `tools.data.households.generate_height_population`, 재학습은 `vehicle_matching.train_height_scenario`를 사용한다. 각 실행은 새 출력 폴더를 사용하고 과거 모델·데이터는 덮어쓰지 않는다. 학습 shard는 로컬에 보존하고 Git에서 제외한다.

## 백업과 검증

로컬 통합 전 전체 DB 덤프: `tmp/catalog-unification-backup/final_sample.sql`. 사용자 정보가 포함된 로컬 백업이므로 Git에 올리지 않는다. 원본 차량 내보내기도 같은 폴더와 `tmp/catalog-audit`에 보존한다.

V27은 제거 대상 테이블에 데이터가 생겼다면 중단한다. Flyway가 적용한 V26~V28은 수정하지 말고 후속 마이그레이션으로 변경한다.

프런트 99개 테스트 및 백엔드 전체 테스트, 신규 스냅샷 검사와 학습·추론 호환 검사, 실제 추천·K5 검색·드림카/저축 화면을 검증했다. ML 전체 회귀 테스트에는 과거 모델 파일 부재와 기존 정책 기대값 불일치가 남아 있다. 변경 전 코드로 같은 실패가 재현되는지 별도 비교했으며 통합 모델의 품질·데이터 검증 결과와 구분한다.
