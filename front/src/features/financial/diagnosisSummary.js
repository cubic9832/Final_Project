import { calculateFinancialSummary } from './calculateFinancialSummary.js';

// 재무 진단 결과 → 마이페이지 "최근 재무 진단" 에 저장할 요약 (POST /members/me/diagnoses, 금액은 원 단위)
// 화면 입력은 만 원 단위라 10,000 을 곱하고, 추천 서버의 가격 상한(budgetPolicy.financialUpper)은 이미 원 단위다
export function buildDiagnosisSummary(diagnosis = {}, result = {}) {
  const totals = calculateFinancialSummary(diagnosis.values, diagnosis.loans ?? []);
  const won = (manwon) => Math.round(Number(manwon || 0) * 10000);
  const upper = result.budgetPolicy?.financialUpper;
  return {
    modelVersion: result.modelVersion,
    // 추천한 모델(학습 결과 폴더) — 여러 모델에 트래픽을 나눠도 모델 관리에서 모델별 진단 수를 센다
    ...(result.modelBundle ? { modelBundle: result.modelBundle } : {}),
    monthlyIncome: won(totals.income),
    monthlyExpense: Math.max(0, won(totals.expenses - totals.loanPayment)),
    monthlyAvailable: won(totals.available),
    purchaseFunds: won(diagnosis.assets?.deposit),
    priceUpper: Number.isFinite(Number(upper)) && upper !== null ? Math.round(Number(upper)) : null,
    // 11-04: 마이페이지 "자세히 보기" 용 — 기타 소득과 기존 대출 (월 상환액이 0 인 빈 줄은 빼고, 최대 10건)
    otherIncome: won(diagnosis.values?.extraIncome),
    loans: (diagnosis.loans ?? [])
      .filter((loan) => Number(loan.payment) > 0)
      .slice(0, 10)
      .map((loan) => ({
        type: loan.type ? String(loan.type).slice(0, 30) : null,
        balance: Number(loan.balance) > 0 ? won(loan.balance) : null,
        payment: won(loan.payment),
      })),
  };
}
