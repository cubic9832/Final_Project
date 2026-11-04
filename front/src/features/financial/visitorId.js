// 비회원도 추천을 받을 때 같은 모델을 계속 받도록(모델 관리의 트래픽 분배) 브라우저에 익명 ID 를 하나 저장해 둔다.
// 저장소를 쓸 수 없으면(사생활 보호 창 등) 이 화면을 연 동안만 쓰는 ID 를 만든다 → 그때는 새로고침하면 모델이 바뀔 수 있다
const STORAGE_KEY = 'recommendation-visitor-id';
let memoryId;

const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function getVisitorId() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    const created = createId();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    memoryId ??= createId();
    return memoryId;
  }
}
