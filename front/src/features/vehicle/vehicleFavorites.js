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
