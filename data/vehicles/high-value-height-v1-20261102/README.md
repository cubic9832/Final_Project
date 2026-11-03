# 고가 차량·전고 통합 카탈로그

- 기존 UI 모델의 308사양과 ml/test 230488c6의 고가/스포츠 차량 자료를 병합했다.
- 총 347사양, 117개 모델. 기록된 최고 가격은 784,000,000원이다.
- 가격이 기록되지 않은 2개 조사 후보는 제외했다. 제외 ID는 build_report.json에 남긴다.
- height_mm은 차량 전고(mm). 전 사양에 값이 있으며 기존 제원 보완본과 제조사 자료를 우선한다.
- 출처별 상태는 height_status, height_source_url 및 height_evidence.json에 보존한다.
- 148사양 official-reference, 2사양 cross-site-reported, 197사양 estimated.
- 전고 범위 1,160~1,990mm. 모델별 국내 연식/트림 동일성을 모두 검증했다는 의미는 아니다.
- 원본 카탈로그와 기존 모델은 변경하지 않았다. 고가 조사 후보의 기존 가격/제원 한계는 원본 해시로 연결한다.

재현:

```powershell
$env:PYTHONPATH='ml;.'
./ml/.venv/Scripts/python.exe -m tools.data.vehicles.build_high_value_height --output <새-카탈로그-폴더>
```

추가 확인한 제조사 자료:
- Revuelto: https://www.lamborghini.com/sites/it-en/files/DAM/lamborghini/facelift_2019/model_detail/revuelto/2024/brochure/07_23/REVUELTO_DIGITAL_BROCHURE_EN_2024.pdf
- Ferrari 296 GTS: https://www.ferrari.com/content/dam/ferrari-fcom/old/pdf/CS_296_GTS_final_gbr.pdf
- Ferrari 12Cilindri Spider: https://www.ferrari.com/content/dam/ferrari-fcom/old/pdf/CS_Ferrari_12Cilindri_Spider_def_gbr.pdf
