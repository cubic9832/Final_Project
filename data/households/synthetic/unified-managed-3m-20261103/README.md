# 통합 카탈로그 300만 비교쌍

공통 관리 카탈로그 전체 384건을 보존하고 공개된 381사양만 학습 후보로 사용한다. 합성 사용자 396,746개, 비교 선택 3,000,000쌍을 재무 그룹 해시로 분리했다. coverage_report와 validation_report에서 노출·재무·가격대·좌석·특징 재계산·누수 검사를 확인할 수 있다.

재현 (프로젝트 루트, PYTHONPATH=ml;.):

```
python -m tools.data.households.generate_height_population --output <새 데이터 폴더> --source data/vehicles/unified-managed-20261103 --comparisons 3000000
python -m vehicle_matching.train_height_scenario --data <새 데이터 폴더> --output <새 모델 폴더> --epochs 30
```

shard-* 파일은 로컬에 보존하며 Git 추적에서 제외한다. 학습 결과는 ml/outputs/models/scenario-choices/20261103-unified-managed-3m에 있다.
