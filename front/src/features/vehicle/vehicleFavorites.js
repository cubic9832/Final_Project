export const vehicleFavoritesKey = memberId => `vehicle-favorites:${memberId == null ? 'guest' : `member:${memberId}`}`;

export function readVehicleFavorites(storage, memberId) {
  const ids = JSON.parse(storage.getItem(vehicleFavoritesKey(memberId)) ?? '[]');
  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) throw new Error('Invalid vehicle favorites');
  return [...new Set(ids)];
}

export function writeVehicleFavorites(storage, memberId, ids) {
  storage.setItem(vehicleFavoritesKey(memberId), JSON.stringify(ids));
}

export function clearVehicleFavorites(storage, memberId) {
  storage.removeItem(vehicleFavoritesKey(memberId));
}

export const FAVORITES_LIMIT = 10;
export const favoritesLimitMessage = `관심차량은 최대 ${FAVORITES_LIMIT}대까지 저장할 수 있습니다. 기존 차량을 삭제한 뒤 추가해 주세요.`;

export function addVehicleFavorites(ids, additions) {
  const next = [...ids];
  const rejected = [];
  for (const id of additions.map(String)) {
    if (next.includes(id)) continue;
    if (next.length >= FAVORITES_LIMIT) rejected.push(id);
    else next.push(id);
  }
  return { ids: next, rejected };
}
