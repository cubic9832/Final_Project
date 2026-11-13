import useAuthStore from '../../stores/useAuthStore.js';

const sessionKey = 'financial-recommendation-draft';
const scopeKey = 'financial-recommendation-scope';
export const comparisonKey = 'financial-vehicle-comparison';
let fallbackScope = crypto.randomUUID();
let fallbackDraft = null;

function getScope() {
  try {
    const scope = sessionStorage.getItem(scopeKey);
    if (scope) return scope;
    sessionStorage.setItem(scopeKey, fallbackScope);
  } catch {
    // Keep navigation scoped in memory when storage is unavailable.
  }
  return fallbackScope;
}

export function scopeFinancialState(state) {
  return { ...state, financialScope: getScope(), financialMemberId: useAuthStore.getState().member?.id ?? null };
}

export function readScopedFinancialState(state, memberId = useAuthStore.getState().member?.id ?? null) {
  if (state?.financialScope !== getScope()) return null;
  return state.financialMemberId === null || state.financialMemberId === memberId ? state : null;
}

function clearFinancialSession() {
  fallbackDraft = null;
  fallbackScope = crypto.randomUUID();
  try {
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(comparisonKey);
    sessionStorage.setItem(scopeKey, fallbackScope);
    localStorage.removeItem(comparisonKey);
  } catch {
    // The in-memory scope still changes when storage is unavailable.
  }
}

useAuthStore.subscribe((state, previous) => {
  if (previous.member && previous.member.id !== state.member?.id) clearFinancialSession();
});

export function readFinancialSession() {
  try {
    return readScopedFinancialState(JSON.parse(sessionStorage.getItem(sessionKey)) ?? fallbackDraft) ?? {};
  } catch {
    return readScopedFinancialState(fallbackDraft) ?? {};
  }
}

export function saveFinancialSession(changes) {
  fallbackDraft = scopeFinancialState({ ...readFinancialSession(), ...changes });
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify(fallbackDraft));
  } catch {
    // 저장소를 사용할 수 없어도 현재 화면에서 입력은 계속할 수 있다.
  }
}

export function clearFinancialDraft() {
  fallbackDraft = null;
  try { sessionStorage.removeItem(sessionKey); } catch { /* Current form remains usable. */ }
}
