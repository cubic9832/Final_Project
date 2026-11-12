import { defaultFinance } from './vehicleData.js';
import { calculateFinancialSummary } from '../financial/calculateFinancialSummary.js';

// 추천 서버가 사용한 구매·유지비 기준을 후속 화면에도 전달한다. 금액은 만 원.
export function purchaseScenario(vehicle, conditions, comparison, catalogFinance = defaultFinance) {
  const candidate = comparison?.result?.recommendations?.find(item => String(item.vehicle.id) === String(vehicle?.id));
  if (!candidate || !comparison?.diagnosis) return { conditions, finance: catalogFinance };
  const diagnosis = comparison.diagnosis;
  const totals = calculateFinancialSummary(diagnosis.values, diagnosis.loans ?? []);
  const cost = candidate.cost;
  const cash = Number(diagnosis.assets?.deposit) || 0;
  const distance = Number(String(diagnosis.vehicle?.annualDistance ?? '').replace(/[^0-9]/g, '')) || 0;
  return {
    conditions: { ...conditions, income: totals.income, expenses: totals.expenses, debt: 0,
      cash, downPayment: Math.min(cash, vehicle.price), monthlyAvailable: cost.remaining_monthly / 10000 + cost.monthly_total / 10000 },
    finance: { months: cost.financing_months, rate: cost.financing_annual_rate * 100, distance,
      baselineDistance: distance, baselineRunning: cost.monthly_running_cost / 10000 },
  };
}

// 추천 결과를 섞지 않는 일반 비교: 모든 차량에 동일한 입력 예산과 기존 일반 할부 가정을 사용한다.
export function catalogPurchaseScenario(conditions, diagnosis) {
  if (!diagnosis?.values) return { conditions, finance: defaultFinance };
  const totals = calculateFinancialSummary(diagnosis.values, diagnosis.loans ?? []);
  const cash = Number(diagnosis.assets?.deposit) || 0;
  const distance = Number(String(diagnosis.vehicle?.annualDistance ?? '').replace(/[^0-9]/g, '')) || 0;
  return { conditions: { ...conditions, income: totals.income, expenses: totals.expenses, debt: 0,
    cash, downPayment: cash, monthlyAvailable: totals.available }, finance: { ...defaultFinance, distance } };
}
