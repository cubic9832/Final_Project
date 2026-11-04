import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDiagnosisSummary } from './diagnosisSummary.js';

test('진단 요약은 만 원 입력을 원으로 바꾸고 가격 상한은 그대로 둔다', () => {
  const summary = buildDiagnosisSummary(
    { values: { income: 300, extraIncome: 20, monthlyExpenses: 150 }, assets: { deposit: 2000 }, loans: [{ payment: 30 }] },
    { modelVersion: 'candidate-v2', budgetPolicy: { financialUpper: 25_000_000 } },
  );
  assert.deepEqual(summary, {
    modelVersion: 'candidate-v2',
    monthlyIncome: 3_200_000,
    monthlyExpense: 1_500_000,
    monthlyAvailable: 1_400_000,
    purchaseFunds: 20_000_000,
    priceUpper: 25_000_000,
    otherIncome: 200_000,
    loans: [{ type: null, balance: null, payment: 300_000 }],
  });
});

test('가격 상한이 없으면 null', () => {
  const summary = buildDiagnosisSummary({ values: { income: 100, monthlyExpenses: 120 }, assets: {} }, { modelVersion: 'candidate-v2' });
  assert.equal(summary.priceUpper, null);
  assert.equal(summary.monthlyAvailable, -200_000);
  assert.equal(summary.purchaseFunds, 0);
});

test('자세히 보기용으로 대출 종류 · 잔액 · 월 상환액을 원 단위로 담고 상환액 0 인 줄은 뺀다', () => {
  const summary = buildDiagnosisSummary(
    { values: { income: 300 }, assets: {}, loans: [{ type: '신용대출', balance: 1000, payment: 25 }, { type: '기타 대출', payment: 0 }] },
    { modelVersion: 'candidate-v2' },
  );
  assert.deepEqual(summary.loans, [{ type: '신용대출', balance: 10_000_000, payment: 250_000 }]);
  assert.equal(summary.otherIncome, 0);
});
