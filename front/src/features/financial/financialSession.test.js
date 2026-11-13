import assert from 'node:assert/strict';
import test from 'node:test';
import useAuthStore from '../../stores/useAuthStore.js';
import {
  readFinancialSession,
  readScopedFinancialState,
  saveFinancialSession,
  scopeFinancialState,
} from './financialSession.js';

test('비회원 입력은 로그인 후 이어지고 로그아웃 후에는 임시 입력과 이전 화면에서 복원되지 않는다', () => {
  const storage = new Map();
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } });
  const { setAuth, clearAuth } = useAuthStore.getState();

  try {
    const guestInput = { income: '300' };
    saveFinancialSession({ values: guestInput });
    const guestHistory = scopeFinancialState({ values: guestInput });

    setAuth({ accessToken: 'test', member: { id: 1 } });
    assert.deepEqual(readFinancialSession().values, guestInput);
    assert.deepEqual(readScopedFinancialState(guestHistory)?.values, guestInput);

    const memberInput = { income: '500' };
    saveFinancialSession({ values: memberInput });
    const memberHistory = scopeFinancialState({ values: memberInput });
    assert.deepEqual(readFinancialSession().values, memberInput);

    clearAuth();
    assert.deepEqual(readFinancialSession(), {});
    assert.equal(readScopedFinancialState(guestHistory), null);
    assert.equal(readScopedFinancialState(memberHistory), null);

    setAuth({ accessToken: 'test', member: { id: 1 } });
    assert.equal(readScopedFinancialState(memberHistory), null);
    assert.deepEqual(readFinancialSession(), {});
  } finally {
    clearAuth();
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
    else delete globalThis.sessionStorage;
  }
});


test('탭 저장소를 사용할 수 없어도 입력을 이어가고 계정 전환 시 비운다', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw new Error('blocked'); } });
  const { setAuth, clearAuth } = useAuthStore.getState();
  try {
    saveFinancialSession({ values: { income: '300' } });
    setAuth({ accessToken: 'test', member: { id: 10 } });
    assert.equal(readFinancialSession().values.income, '300');
    saveFinancialSession({ vehicle: { fuel: null } });
    assert.equal(readFinancialSession().vehicle.fuel, null);
    setAuth({ accessToken: 'test', member: { id: 11 } });
    assert.deepEqual(readFinancialSession(), {});
  } finally {
    clearAuth();
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
  }
});
