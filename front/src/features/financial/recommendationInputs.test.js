import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendationInputPayload, mergeRecommendationInputs, recommendationQuestionHasError } from './recommendationInputs.js';
import { createVehiclePreferences } from './createVehiclePreferences.js';

test('금액 빈 값과 0, 대출 소수점 및 미선택을 보존하고 실행 결과를 제외한다', () => {
  const draft = { values: { income: '', monthlyExpenses: '0' }, loanDetails: [{ payment: '1.2345' }], vehicle: { exteriorAngularity: null, fuel: '전기', scenarioMode: true }, result: { secret: true }, financialScope: 'tab' };
  const payload = recommendationInputPayload(draft);
  assert.deepEqual(payload, { financialInputs: { values: draft.values, loanDetails: draft.loanDetails }, vehiclePreferences: { exteriorAngularity: null, fuel: '전기' } });
  const restored = mergeRecommendationInputs(payload, {});
  assert.equal(restored.values.income, '');
  assert.equal(restored.values.monthlyExpenses, '0');
  assert.equal(createVehiclePreferences(restored.vehicle).exteriorAngularity, null);
});

test('저장값 위에 현재 탭 입력만 우선하고 다른 영역을 저장하지 않는다', () => {
  const saved = { financialInputs: { values: { income: '500' }, assets: { deposit: '1000' } }, vehiclePreferences: { fuel: '전기', exteriorAngularity: '1' } };
  const restored = mergeRecommendationInputs(saved, { values: { income: '300' }, vehicle: { fuel: '디젤' } });
  assert.equal(restored.values.income, '300');
  assert.equal(restored.assets.deposit, '1000');
  assert.equal(restored.vehicle.exteriorAngularity, '1');
  assert.equal(restored.vehicle.fuel, '디젤');
  assert.equal(recommendationInputPayload(restored, 'financial').vehiclePreferences, undefined);
  assert.equal(recommendationInputPayload(restored, 'vehicle').financialInputs, undefined);
  assert.equal(recommendationInputPayload({ values: { income: '100' } }).vehiclePreferences, undefined);
});

test('서버의 상세 대출 검증 오류는 대출 질문에 연결한다', () => {
  const errors = [{ field: 'financialInputs.loanDetails[0].payment', message: 'invalid' }];
  assert.equal(recommendationQuestionHasError('loans', errors), true);
  assert.equal(recommendationQuestionHasError('income', errors), false);
});
