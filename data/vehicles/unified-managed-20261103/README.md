# 공통 차량 카탈로그

`managed_vehicles`의 버전 고정 학습 스냅샷이다. 384개 ID와 Vehicle dataclass의 모든 필드가 DB와 동일하며, API 전용 부가 컬럼은 managed_rows.json에 보존한다.

- catalog.json: 학습·서빙에서 공유하는 원본 사양. 공개 381건, 검토 3건은 recommendation_enabled=false.
- legacy_mapping.json: 구형 vehicles의 258개 숫자 ID를 공통 문자열 ID에 연결.
- managed_rows.json: 전체 관리용 payload와 상태를 포함한 가져오기 기록.
- build_report.json: 입력 파일 해시·추가 ID·제외된 검토 ID.
- database_verification.json: 실제 DB의 모든 ID·ML 필드와 대조한 결과.
- vehicle_traits.json / height_evidence.json: 기존 근거를 보존하고, 누락 특성에 대해서만 명시적인 추정·중립 가정을 기록.

원본 DB 내보내기는 tmp/catalog-unification-backup 및 tmp/catalog-audit에 보존했다. 새로운 내보내기에 tools.data.vehicles.unify_managed_catalog를 실행할 때는 새 출력 폴더를 사용한다. 기존 모델 폴더나 학습 파일은 덮어쓰지 않는다.
