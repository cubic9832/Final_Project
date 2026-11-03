const sessionKey = 'financial-recommendation-draft';

export function readFinancialSession() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(sessionKey));
    return draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : {};
  } catch {
    return {};
  }
}

export function saveFinancialSession(changes) {
  try {
    sessionStorage.setItem(sessionKey, JSON.stringify({ ...readFinancialSession(), ...changes }));
  } catch {
    // 저장소를 사용할 수 없어도 현재 화면에서 입력은 계속할 수 있다.
  }
}
