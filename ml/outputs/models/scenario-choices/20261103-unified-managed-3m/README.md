# 공통 관리 카탈로그 재학습 (2026-11-03)

- 원본: `managed_vehicles` 384사양. 공개 381건·검토 3건.
- `catalog.json`은 DB의 모든 ID와 ML 입력 필드가 일대일로 일치한다.
- 검토 3건은 `recommendation_enabled=false`로 보존하며 학습 후보·추천에서 제외한다.
- 구형 `vehicles` 258행의 ID 매핑을 보존했다. 동일 사양으로 확정되지 않은 34행과 기존 모델 전용 39행을 추가했다.
- 사용자 396,746개·비교 선택 3,000,000쌍, 재무 그룹 분리, 30 epochs, 검증 log loss로 epoch 11 선택.
- MLP holdout 정확도 69.310759%, log loss 0.555291.
- 선형 기준 정확도 69.375432%. MLP가 선형 모델보다 우수하다는 결과는 아니다.
- 합성 선택 데이터의 평가이며 실제 고객 만족도·구매 확률이 아니다.
- 새 차량의 미수집 전고와 디자인·가속 특성은 명시적인 추정/중립값이며 공식 검증값으로 승격하지 않았다.
- 수소차 계산 단위는 km/kg, 13,000원/kg은 실시간 가격이 아닌 개발용 가정이다.
- 모든 파일 해시·39입력 재계산·재무/좌석/가격대·분할 누수·저장 후 추론 일치 검증 통과.
- DB와 모델의 공개 카탈로그가 달라지면 추천 API는 503을 반환하고 재학습을 요구한다(검사 캐시 최대 5초).

데이터: `data/households/synthetic/unified-managed-3m-20261103/`
원본/매핑/DB 대조: `data/vehicles/unified-managed-20261103/`
학습 실행: `PYTHONPATH=ml;. python -m vehicle_matching.train_height_scenario --data data/households/synthetic/unified-managed-3m-20261103 --output <새 모델 폴더> --epochs 30`
기본 실행: `./ml/serve-candidates.ps1`
