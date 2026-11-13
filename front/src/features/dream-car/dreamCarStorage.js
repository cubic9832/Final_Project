import useAuthStore from '../../stores/useAuthStore.js';

export function dreamCarStorageKey(key, memberId = useAuthStore.getState().member?.id ?? null) {
  return `${key}:${memberId == null ? 'guest' : `member:${memberId}`}`;
}

export function clearDreamCarStorage(memberId) {
  for (const key of ['dream-car-plan-v3', 'dream-car-plan-v2', 'dream-car-progress-v1', 'dream-car-draft-v1']) {
    localStorage.removeItem(dreamCarStorageKey(key, memberId));
  }
  localStorage.removeItem(`savings-notification-events:${memberId}`);
}
