# 고가 차량·전고 포함 300만 비교 선택 데이터

- 사용자 프로필 396,633개, 비교 선택 정확히 3,000,000쌍.
- 347사양·117개 모델. 2억 4,800만 원 초과 사양 18개를 포함한다.
- 재무 그룹 해시로 train/validation/test를 나누고 같은 그룹을 중복 생성하지 않는다.
- 현재 UI 입력 계약을 유지하고 전고(height_mm / 3500)를 추가한 39입력 형식이다.
- NPZ(features, comparisons, labels, profile_ids, vehicle_indices)와 profiles/choices JSONL은 기존 UI 데이터와 같은 구조다.
- 구매 가능 예산의 60/70/80% 가격 하한과 100% 상한을 적용한 뒤 재무·좌석 적격 후보끼리 비교한다.
- 고자산 사용자 구간을 35% 확률로 표본 추출해 고가 차량의 학습 노출을 확보한다.
- profile별 최대 10쌍. 후보 모델이 적으면 가능한 조합만 사용하며 마지막 프로필에서 목표 수를 정확히 맞춘다.
- coverage_report.json은 모든 모델의 분할별 최소 노출과 전 사양의 노출을 검사한다.
- 출처와 추정 상태는 height_evidence.json 및 build_report.json에 보존한다.
- labels는 합성 확률 추첨 결과이며 실제 구매나 만족도 관측이 아니다.
- shard 파일은 로컬 산출물로 보존하며 Git 추적에서 제외한다.

재현(프로젝트 루트):

```powershell
$env:PYTHONPATH='ml;.'
./ml/.venv/Scripts/python.exe -m tools.data.households.generate_height_population --output <새-데이터-경로> --comparisons 3000000
./ml/.venv/Scripts/python.exe -m vehicle_matching.train_height_scenario --data <데이터-경로> --output <새-모델-경로> --epochs 30
```
