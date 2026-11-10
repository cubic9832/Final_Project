import useAuthStore from '../../stores/useAuthStore.js';
import { comparisonKey, readScopedFinancialState, scopeFinancialState } from '../financial/financialSession.js';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applyProfilePreset, findProfilePreset } from '../preset/profilePresets';
import { toggleRecommendationComparison } from './recommendationComparison.js';
import { VehicleContext } from './useVehicle';
import { isFinancialRecommendationResult } from '../financial/isFinancialRecommendationResult.js';
import { defaultConditions } from './vehicleData';
import { getVehicles, getPlanningVehicles, selectPresetVehicles } from './vehicleApi';

function readSaved() {
  try { const value = JSON.parse(localStorage.getItem('vehicle-favorites') || '[]'); return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []; } catch { return []; }
}
export function VehicleProvider({ children }) {
  const location = useLocation();
  const [catalog, setCatalog] = useState({ status: 'loading', vehicles: [], planningVehicles: [], error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getVehicles(controller.signal), getPlanningVehicles(controller.signal)]).then(([vehicles, planningVehicles]) => {
      if (!controller.signal.aborted) setCatalog({ status: 'ready', vehicles, planningVehicles, error: '' });
    }).catch((error) => {
      if (!controller.signal.aborted) setCatalog({ status: 'error', vehicles: [], planningVehicles: [], error: error.response?.data?.detail ?? '차량 목록을 불러오지 못했습니다. 서버 연결을 확인해 주세요.' });
    });
    return () => controller.abort();
  }, [attempt]);
  const { vehicles } = catalog;
  const presetId = location.pathname === '/vehicles/compare' ? new URLSearchParams(location.search).get('preset') : null;
  const [selection, setSelection] = useState({ presetId: null, conditions: defaultConditions, comparison: [] });
  if (selection.presetId !== presetId || (presetId && catalog.status === 'ready' && !selection.presetResolved)) {
    const preset = findProfilePreset(presetId);
    setSelection({ ...selection, ...(preset ? { ...applyProfilePreset(preset), comparison: selectPresetVehicles(preset.vehicleIds, vehicles) } : {}), presetId, presetResolved: catalog.status === 'ready' });
  }
  const { conditions } = selection;
  function setConditions(next) {
    setSelection((current) => ({ ...current, conditions: typeof next === 'function' ? next(current.conditions) : next }));
  }
  const authInitialized = useAuthStore(state => state.initialized);
  const memberId = useAuthStore(state => state.member?.id ?? null);
  const [savedFinancialComparison, setFinancialComparison] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(comparisonKey));
      return isFinancialRecommendationResult(saved?.result) && saved?.diagnosis?.values && Array.isArray(saved.ids) && saved.ids.length <= 3 && saved.ids.every(id => saved.result.recommendations.some(candidate => candidate.vehicle.id === id)) ? saved : null;
    } catch { return null; }
  });
  const financialComparison = authInitialized
    ? readScopedFinancialState(savedFinancialComparison, memberId) : null;
  const recommendedComparisonIds = (financialComparison?.ids ?? []).map(String)
    .filter(id => vehicles.some(vehicle => vehicle.id === id));
  const comparison = presetId
    ? selection.comparison
    : [...new Set([...recommendedComparisonIds, ...selection.comparison])].slice(0, 3);
  function saveFinancialComparison(next) {
    const scoped = next ? scopeFinancialState(next) : null;
    setFinancialComparison(scoped);
    try {
      if (scoped) sessionStorage.setItem(comparisonKey, JSON.stringify(scoped));
      else sessionStorage.removeItem(comparisonKey);
      setStorageError('');
    } catch { setStorageError('브라우저 저장 공간을 사용할 수 없어 이번 방문 중에만 저장됩니다.'); }
  }
  function toggleFinancialComparison(id, result, diagnosis) {
    if (!financialComparison?.ids.includes(id) && !comparison.includes(String(id)) && comparison.length >= 3) return;
    saveFinancialComparison(toggleRecommendationComparison(financialComparison, id, result, diagnosis));
  }
  const [favorites, setFavorites] = useState(readSaved);
  const favoriteComparison = [...new Set(favorites)].filter(id => vehicles.some(vehicle => vehicle.id === id));
  const [storageError, setStorageError] = useState('');
  function toggleFavorite(id) {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem('vehicle-favorites', JSON.stringify(next)); setStorageError(''); } catch { setStorageError('브라우저 저장 공간을 사용할 수 없어 이번 방문 중에만 저장됩니다.'); }
  }
  // 회원 탈퇴 때 이 브라우저의 관심차량 목록도 지운다 (개인정보 · 계정 관리 화면의 탈퇴에서 호출)
  function clearFavorites() {
    setFavorites([]);
    try { localStorage.removeItem('vehicle-favorites'); } catch { /* 저장 공간을 못 쓰면 지울 것도 없다 */ }
  }
  function toggleComparison(id) {
    if (comparison.includes(id)) {
      const recommendedId = financialComparison?.ids.find(item => String(item) === id);
      if (!presetId && recommendedId !== undefined) toggleFinancialComparison(recommendedId);
      setSelection(current => ({ ...current, comparison: current.comparison.filter(item => item !== id) }));
    } else if (comparison.length < 3) {
      setSelection(current => ({ ...current, comparison: [...comparison, id].filter(item => !recommendedComparisonIds.includes(item) || presetId) }));
    }
  }
  return <VehicleContext.Provider value={{ vehicles, planningVehicles: catalog.planningVehicles, catalogStatus: catalog.status, catalogError: catalog.error, retryCatalog: () => { setCatalog({ status: 'loading', vehicles: [], planningVehicles: [], error: '' }); setAttempt((value) => value + 1); }, conditions, setConditions, comparison, toggleComparison, financialComparison, toggleFinancialComparison, favoriteComparison, favorites, toggleFavorite, clearFavorites, storageError }}>{children}</VehicleContext.Provider>;
}
