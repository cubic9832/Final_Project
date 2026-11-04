# 차량 추천 ML

## 현재 모델과 데이터

카탈로그 통합 기준과 삭제한 구형 테이블은 [공통 차량 카탈로그](../docs/vehicle-catalog.md)를 참고한다.

- 기본 모델: `ml/outputs/models/scenario-choices/20261103-unified-managed-3m/`
- 학습 자료: `data/households/synthetic/unified-managed-3m-20261103/`
- 합성 사용자 396,746명·비교 선택 3,000,000쌍으로 학습한 전고 포함 39입력 MLP다.
- 재무·필수 좌석 조건과 가성비별 구매 가격대를 검사한 뒤 학습 모델 점수로 정렬한다.
- 구매 가능 자금(예금에서 비상자금을 제외하고 별도 가격 상한을 적용한 금액)을 기준으로 가성비 높음(4~5)은 60~100%, 보통(3)은 70~100%, 낮음(1~2)은 80~100% 가격대의 후보를 우선 추천한다. 서로 다른 적격 모델이 요청 수보다 부족하면 하한 아래 차량으로 보충한다. 가격대 내/보충 그룹별로 취향·중요도를 반영한 점수순으로 정렬하며 구매 상한·재무·필수 좌석 조건은 완화하지 않는다.
- 고자산 예외: 가격 하한이 전체 카탈로그 최고가를 넘어 추천이 비면, 재무·필수 좌석을 충족하는 차량 중 서로 다른 최고가 9개 모델을 먼저 고르고 취향·중요도가 반영된 ML 점수순으로 정렬한다. 모델별 최고가 사양을 후보로 사용하며 9개 미만이면 적격 모델만 반환한다.
- 모델 파일·카탈로그·차량 특징의 SHA-256을 검증하고 로딩하며 요청마다 재학습하지 않는다.
- 기존 hhc의 `candidate-preferences/20261027-seating-verified-v1` 모델은 보존한다.
- 소스: `origin/ml/test`의 `230488c6`. 프론트엔드 변경도 후속 병합했으며 hhc의 채팅·진단 저장 기능을 함께 유지한다.

## 설치와 실행

프로젝트 루트 PowerShell:

```powershell
python -m venv ml/.venv
& ./ml/.venv/Scripts/python.exe -m pip install -e "./ml[serve,test]"
./ml/serve-candidates.ps1
```

API는 `127.0.0.1:8002`, 추천은 `POST /api/v2/recommendations`를 사용한다.
루트 `dev.ps1`도 같은 서버를 실행한다. 모델 교체 후 서버를 재시작한다.
기존 hhc 모델을 사용하려면 `-Run 'outputs/models/candidate-preferences/20261027-seating-verified-v1'`을 지정한다.

## 데이터 재생성과 학습

추적된 데이터에는 카탈로그·특징·설정·manifest·검증 결과가 포함된다.
대용량 학습 shard는 원본 브랜치에서도 Git 추적 대상이 아니므로 새 경로에 재생성한다.

```powershell
$env:PYTHONPATH='ml;.'
& ./ml/.venv/Scripts/python.exe -m tools.data.households.generate_ui_scenario_population --output tmp/ui-scenario-new --profiles 10000
& ./ml/.venv/Scripts/python.exe -m vehicle_matching.train_ui_scenario --data tmp/ui-scenario-new --output ml/outputs/models/scenario-choices/new-run --epochs 30
```

UI 모델은 비용·자금 보존·유지비 중요도와 윤곽·가속·연료·크기 취향을 학습했다.
hhc 화면의 이용 환경·취향 입력을 새 모델의 scenario 요청으로 전달한다.
정답은 합성 선택이며 평가 정확도는 실제 구매 확률이나 만족도가 아니다.
상세 결과는 현재 모델 폴더의 README.md와 training_report.json을 참고한다.

## 검증

```powershell
$env:PYTHONPATH='ml;.'
& ./ml/.venv/Scripts/python.exe -m unittest discover -s ml/tests -p test_ui_scenario.py
& ./ml/.venv/Scripts/python.exe -m unittest discover -s ml/tests -p test_scenario_training.py
```

## 공통 DB 카탈로그 300만 쌍 재학습 (2026-11-03)

- 모델: `outputs/models/scenario-choices/20261103-unified-managed-3m/`
- 데이터: `data/households/synthetic/unified-managed-3m-20261103/`
- 전체 384사양·123모델(공개 381사양·121모델), 전고를 포함한 39입력. 비교 선택 정확히 300만 쌍.
- 30에포크 학습 및 전체 데이터·재로딩·API 검증 완료. 상세 지표와 한계는 해당 모델 README.md를 참고한다.
- 기본 실행 스크립트와 API에 적용했다. 이전 UI 모델은 `-Run outputs/models/scenario-choices/20261030-ui-v1-10k`로 선택할 수 있다.
