import { useEffect, useState } from 'react';
import { clearVehicleFavorites, readVehicleFavorites, vehicleFavoritesKey, writeVehicleFavorites, addVehicleFavorites, favoritesLimitMessage } from './vehicleFavorites.js';

function read(memberId, key) {
  try { return { key, ids: key ? readVehicleFavorites(localStorage, memberId) : [], error: '' }; }
  catch { return { key, ids: [], readFailed: true, error: '관심 차량을 읽지 못했습니다. 브라우저 저장 공간을 확인해 주세요.' }; }
}

export default function useVehicleFavorites(memberId, initialized) {
  const key = initialized ? vehicleFavoritesKey(memberId) : null;
  const [saved, setSaved] = useState(() => read(memberId, key));
  if (saved.key !== key) setSaved(read(memberId, key));
  const favorites = saved.key === key ? saved.ids : [];
  useEffect(() => {
    if (!key) return;
    const update = event => { if (event.key === null || event.key === key) setSaved(read(memberId, key)); };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [key, memberId]);

  function commit(next, notice = '') {
    let error = notice;
    try { writeVehicleFavorites(localStorage, memberId, next); }
    catch { error = '브라우저 저장 공간을 사용할 수 없어 관심차량은 이번 방문 중에만 저장됩니다.'; }
    setSaved({ key, ids: next, error });
  }
  function addFavorites(ids) {
    if (!initialized || saved.readFailed) return [];
    const next = addVehicleFavorites(favorites, ids);
    commit(next.ids, next.rejected.length ? favoritesLimitMessage : '');
    return next.ids;
  }
  function toggleFavorite(id) {
    if (!initialized || saved.readFailed) return;
    const value = String(id);
    if (favorites.includes(value)) commit(favorites.filter(item => item !== value));
    else addFavorites([value]);
  }
  function clearFavorites() {
    let error = '';
    try { clearVehicleFavorites(localStorage, memberId); }
    catch { error = '브라우저에 저장된 관심 차량을 지우지 못했습니다. 사이트 데이터를 확인해 주세요.'; }
    setSaved({ key, ids: [], error });
  }
  return { favorites, addFavorites, toggleFavorite, clearFavorites, reloadFavorites: () => setSaved(read(memberId, key)), favoritesReadFailed: Boolean(saved.readFailed), error: saved.key === key ? saved.error : '' };
}
