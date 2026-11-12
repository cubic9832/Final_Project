import { defaultFinance } from './vehicleData.js';
import { calculateFinancialSummary } from '../financial/calculateFinancialSummary.js';

// 추천 서버가 사용한 구매·유지비 기준을 후속 화면에도 전달한다. 금액은 만 원.
export function purchaseScenario(vehicle, conditions, comparison) {
  const candidate = comparison?.result?.recommendations?.find(item => String(item.vehicle.id) === String(vehicle?.id));
  if (!candidate || !comparison?.diagnosis) return { conditions, finance: defaultFinance };
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
