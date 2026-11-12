import test from 'node:test';
import assert from 'node:assert/strict';
import { dreamCarStorageKey, clearDreamCarStorage } from './dreamCarStorage.js';
import { calculatePurchasePlan, defaultPlan } from './purchasePlan.js';

test('회원 전환과 탈퇴 시 다른 회원의 계획과 소유자 불명 기록은 읽거나 지우지 않는다', () => {
  const values = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = { removeItem: key => values.delete(key) };
  try {
    for (const key of ['dream-car-plan-v3', 'dream-car-progress-v1']) {
      values.set(key, 'legacy');
      values.set(dreamCarStorageKey(key, 1), 'A');
      values.set(dreamCarStorageKey(key, 2), 'B');
      values.set(dreamCarStorageKey(key, null), 'guest');
    }
    clearDreamCarStorage(1);
    assert.equal(values.get(dreamCarStorageKey('dream-car-plan-v3', 1)), undefined);
    assert.equal(values.get(dreamCarStorageKey('dream-car-plan-v3', 2)), 'B');
    assert.equal(values.get('dream-car-plan-v3'), 'legacy');
    assert.equal(values.get(dreamCarStorageKey('dream-car-plan-v3', null)), 'guest');
  } finally { globalThis.localStorage = previous; }
});

test('구매계획 생성의 목표 기간도 1~1200개월 정수로 제한한다', () => {
  for (const targetMonths of [0, 1.5, 1201]) assert.equal(calculatePurchasePlan(3000, { ...defaultPlan, targetMonths }), null);
  for (const targetMonths of [1, 1200]) assert.ok(calculatePurchasePlan(3000, { ...defaultPlan, targetMonths }));
});
