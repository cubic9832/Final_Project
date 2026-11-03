# 고가 차량·전고 300만 비교 선택 재학습

- 모델: ui-scenario-height-ranker-v2, 39 → 64 → 32 → 1 MLP.
- 기존 38입력에 height_mm / 3500 특징을 추가했다. 전고 선호를 별도로 입력받는 UI는 추가하지 않았다.
- 카탈로그 347사양·117모델, 전고 누락 0개. 최고 기록 가격 784,000,000원.
- 가격 미기록 조사 후보 2개는 제외했다. 세부 출처·추정 상태는 데이터 height_evidence.json에 보존한다.
- 합성 사용자 396,633개, 비교 선택 정확히 3,000,000쌍.
- train 2,104,297쌍 / validation 449,890쌍 / test 445,813쌍.
- 30 epochs 학습, 검증 log loss 기준 epoch 9 선택.
- MLP 평가: 정확도 69.215344%, log loss 0.556320, Brier 0.190916.
- 선형 기준 모델: 정확도 69.233064%, log loss 0.555855. 이 합성 교사 정책에서는 선형 모델이 근소하게 더 좋으며 MLP의 우월성을 주장하지 않는다.
- 기존 38입력 모델의 동일 holdout 평가: 정확도 68.965687%, log loss 0.559018.
- 합성 정답 예측 수치이며 실제 구매 확률·만족도가 아니다.
- 전체 파일 해시, 분할 그룹 누수, 39특징 재계산, Decimal 현금/12개월 보전, 필수 좌석, 가성비 가격대 검사 통과.
- 저장 후 재로딩과 추론 일치, API 39입력·347사양 응답 및 Revuelto/12Cilindri 추천·전고 반환 검증 통과.
- 서비스 기본 모델은 자동 교체하지 않았다. 선택 실행 시 기존 UI API와 호환한다.

데이터: data/households/synthetic/ui-height-high-value-3m-20261102
재현: 해당 데이터 폴더 README.md와 tools/data/vehicles/build_high_value_height.py 참고.

선택 실행:

```powershell
./ml/serve-candidates.ps1 -Run outputs/models/scenario-choices/20261102-height-high-value-3m -Port 8003
```

학습 결과: training_report.json. API 검증/기존 모델 비교: serving_verification.json.
