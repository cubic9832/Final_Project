import { comparisonMode, toggleCatalogComparison } from './recommendationComparison.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseScenario, catalogPurchaseScenario } from './purchaseScenario.js';
import { calculateCosts, defaultConditions } from './vehicleData.js';
import { validateBirthDate } from '../../pages/signup/profileRules.js';

const vehicle = { id: 'trax', price: 2398, efficiency: 12, type: 'SUV', fuel: 'GASOLINE' };
const comparison = {
  diagnosis: { values: { income: 300, monthlyExpenses: 100 }, assets: { deposit: 3000 }, loans: [], vehicle: { annualDistance: '15,000km' } },
  result: { recommendations: [{ vehicle: { id: 'trax' }, cost: { financing_months: 0, financing_annual_rate: 0, monthly_total: 362000, monthly_running_cost: 362000, remaining_monthly: 1638000 } }] },
};

test('추천의 일시불 조건과 월 잔여금을 시뮬레이션에서도 유지한다', () => {
  const { conditions, finance } = purchaseScenario(vehicle, defaultConditions, comparison);
  const costs = calculateCosts(vehicle, conditions, finance);
  assert.equal(finance.months, 0);
  assert.equal(costs.downPayment, 2398);
  assert.equal(costs.cashRemaining, 602);
  assert.equal(costs.installment, 0);
  assert.equal(costs.total, 36.2);
  assert.equal(costs.remaining, 163.8);
});

test('차량 가격과 실제 보유 현금 중 작은 값으로 선수금을 제한한다', () => {
  for (const [cash, expected] of [[2000, 2000], [2398, 2398], [3000, 2398]]) {
    const costs = calculateCosts(vehicle, { ...defaultConditions, cash, downPayment: 9999 });
    assert.equal(costs.downPayment, expected);
    assert.equal(costs.cashRemaining, cash - expected);
    assert.ok(costs.installment >= 0);
  }
});

test('달력에 없는 생년월일은 거부하고 윤년의 정상 날짜는 허용한다', () => {
  const today = new Date(2026, 10, 12);
  for (const value of ['2000-02-30', '2001-02-29', '2000-13-01', '20000229']) assert.notEqual(validateBirthDate(value, today), '');
  assert.equal(validateBirthDate('2000-02-29', today), '');
});


test('일반 차량 추가로 전환한 비교는 모든 차량을 같은 진단 예산과 일반 금융 조건으로 계산한다', () => {
  const saved = { ...comparison, ids: ['trax'] };
  assert.equal(comparisonMode(false, false, saved), 'recommendation');
  const ids = toggleCatalogComparison(saved.ids, 'other');
  const scenario = catalogPurchaseScenario(defaultConditions, saved.diagnosis);
  assert.equal(comparisonMode(false, true, saved), 'catalog');
  const cars = [vehicle, { ...vehicle, id: 'other', price: 3400 }];
  const costs = ids.map(id => calculateCosts(cars.find(car => car.id === id), scenario.conditions, scenario.finance));
  assert.equal(scenario.conditions.cash, 3000);
  assert.equal(scenario.conditions.monthlyAvailable, 200);
  assert.equal(scenario.finance.months, 48);
  assert.equal(scenario.finance.rate, 5.5);
  for (const cost of costs) assert.equal(cost.remaining, 200 - cost.total);
  assert.ok(costs[1].installment > 0);
  assert.deepEqual(saved.result, comparison.result);
  assert.equal(comparisonMode(true, false, saved), 'catalog');
  assert.deepEqual(toggleCatalogComparison(ids, 'trax'), ['other']);
});
