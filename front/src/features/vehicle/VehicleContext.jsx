import useVehicleFavorites from './useVehicleFavorites.js';
import { catalogPurchaseScenario } from './purchaseScenario.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { comparisonKey, readScopedFinancialState, scopeFinancialState } from '../financial/financialSession.js';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applyProfilePreset, findProfilePreset } from '../preset/profilePresets';
import { COMPARISON_LIMIT, comparisonMode, toggleCatalogComparison, toggleRecommendationComparison } from './recommendationComparison.js';
import { VehicleContext } from './useVehicle';
import { isFinancialRecommendationResult } from '../financial/isFinancialRecommendationResult.js';
import { defaultConditions, defaultFinance } from './vehicleData';
import { getVehicles, getPlanningVehicles, selectPresetVehicles } from './vehicleApi';

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
  const [selection, setSelection] = useState({ appliedPresetId: null, conditions: defaultConditions, finance: defaultFinance, comparison: [], options: [] });
  if (presetId && (selection.appliedPresetId !== presetId || (catalog.status === 'ready' && !selection.presetResolved))) {
    const preset = findProfilePreset(presetId);
    setSelection({ ...selection, ...(preset ? { ...applyProfilePreset(preset), comparison: selectPresetVehicles(preset.vehicleIds, vehicles), options: selectPresetVehicles(preset.vehicleIds, vehicles), finance: defaultFinance, fromPreset: true, generalComparison: true, notice: '' } : {}), appliedPresetId: presetId, presetResolved: catalog.status === 'ready' });
  }
  const { conditions } = selection;
  const finance = selection.finance ?? defaultFinance;
  function setConditions(next) {
    setSelection((current) => ({ ...current, conditions: typeof next === 'function' ? next(current.conditions) : next }));
  }
  const authInitialized = useAuthStore(state => state.initialized);
  const memberId = useAuthStore(state => state.member?.id ?? null);
  const [savedFinancialComparison, setFinancialComparison] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(comparisonKey));
      const source = saved?.recommendationResult ?? saved?.result;
      return isFinancialRecommendationResult(source) && saved?.diagnosis?.values && Array.isArray(saved.ids) && saved.ids.length <= COMPARISON_LIMIT && saved.ids.every(id => source.recommendations.some(candidate => String(candidate.vehicle.id) === String(id))) ? { ...saved, result: source, recommendationResult: source } : null;
    } catch { return null; }
  });
  const owner = authInitialized ? String(memberId ?? 'guest') : null;
  const [selectionOwner, setSelectionOwner] = useState(owner);
  if (selectionOwner !== owner) {
    setSelectionOwner(owner);
    setSelection({ appliedPresetId: null, conditions: defaultConditions, finance: defaultFinance, comparison: [], options: [] });
  }
  const financialComparison = authInitialized
    ? savedFinancialComparison?.financialMemberId === memberId ? readScopedFinancialState(savedFinancialComparison, memberId) : null : null;
  const mode = comparisonMode(Boolean(selection.fromPreset), Boolean(selection.generalComparison), financialComparison);
  const recommendedComparisonIds = (financialComparison?.ids ?? []).map(String);
  const comparison = mode === 'recommendation' ? recommendedComparisonIds : selection.comparison;
  const comparisonOptions = mode === 'recommendation'
    ? financialComparison.result.recommendations.map(candidate => String(candidate.vehicle.id))
    : selection.options ?? selection.comparison;
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
    const current = mode === 'recommendation' ? financialComparison : financialComparison && { ...financialComparison, ids: [] };
    const next = toggleRecommendationComparison(current, id, result, diagnosis);
    if (!next || next === financialComparison) return;
    const adding = next.ids.some(value => !comparison.includes(String(value)));
    if (adding && !addFavorites([id]).includes(String(id))) return;
    setSelection(current => ({ ...current, fromPreset: false, generalComparison: false, notice: '' }));
    saveFinancialComparison(next);
  }
  const { favorites, addFavorites, toggleFavorite: toggleSavedFavorite, clearFavorites: clearSavedFavorites, reloadFavorites, favoritesReadFailed, error: favoritesError } = useVehicleFavorites(memberId, authInitialized);
  const favoriteComparison = favorites.filter(id => vehicles.some(vehicle => vehicle.id === id));
  const [storageError, setStorageError] = useState('');
  function toggleFavorite(id) {
    if (favorites.includes(String(id))) removeComparison(String(id));
    toggleSavedFavorite(id);
  }
  function removeComparison(id) {
    setSelection(current => ({ ...current, comparison: current.comparison.filter(value => String(value) !== id), options: (current.options ?? []).filter(value => String(value) !== id) }));
    if (financialComparison?.ids.some(value => String(value) === id)) saveFinancialComparison({ ...financialComparison, ids: financialComparison.ids.filter(value => String(value) !== id) });
  }
  function clearFavorites() {
    clearSavedFavorites();
    setSelection(current => ({ ...current, comparison: [], options: [] }));
    if (financialComparison) saveFinancialComparison({ ...financialComparison, ids: [] });
  }
  // 소유자가 확인된 이전 추천 비교를 한 번만 관심차량으로 반영한다.
  const [migratedComparison, setMigratedComparison] = useState(null);
  useEffect(() => {
    if (!authInitialized || !financialComparison || favoritesReadFailed || migratedComparison === savedFinancialComparison) return;
    const ids = addFavorites(financialComparison.ids);
    setMigratedComparison(savedFinancialComparison);
    if (financialComparison.ids.some(id => !ids.includes(String(id)))) {
      saveFinancialComparison({ ...financialComparison, ids: financialComparison.ids.filter(id => ids.includes(String(id))) });
      setStorageError('저장 한도를 초과한 차량은 비교 선택에서 제외했습니다.');
    }
  }, [authInitialized, savedFinancialComparison, favoritesReadFailed, migratedComparison]);
  // 다른 탭에서 삭제된 차량도 현재 비교에서 제외한다.
  const favoriteSignature = JSON.stringify(favorites);
  useEffect(() => {
    if (!authInitialized || favoritesReadFailed) return;
    setSelection(current => current.fromPreset ? current : { ...current, comparison: current.comparison.filter(id => favorites.includes(String(id))), options: (current.options ?? []).filter(id => favorites.includes(String(id))) });
    if (financialComparison && migratedComparison === savedFinancialComparison && financialComparison.ids.some(id => !favorites.includes(String(id)))) {
      saveFinancialComparison({ ...financialComparison, ids: financialComparison.ids.filter(id => favorites.includes(String(id))) });
    }
  }, [favoriteSignature, authInitialized]);
  function toggleComparison(id) {
    const key = String(id);
    if (!comparison.includes(key)) {
      if (comparison.length >= COMPARISON_LIMIT) return;
      if (!addFavorites([key]).includes(key)) return;
    }
    if (mode === 'recommendation') {
      const candidate = financialComparison.result.recommendations.find(item => String(item.vehicle.id) === key);
      if (candidate) { toggleFinancialComparison(candidate.vehicle.id); return; }
      if (comparison.length >= COMPARISON_LIMIT) return;
      const scenario = catalogPurchaseScenario(conditions, financialComparison.diagnosis);
      saveFinancialComparison({ ...financialComparison, ids: [] });
      setSelection(current => ({ ...current, ...scenario, fromPreset: false, generalComparison: true,
        comparison: toggleCatalogComparison(comparison, key), options: [...new Set([...comparison, key])],
        notice: '일반 비교로 전환했습니다. 모든 차량을 입력한 예산과 공통 48개월·연 5.5% 할부 조건으로 다시 계산합니다.',
      }));
      return;
    }
    // 연속 선택이 이전 렌더의 목록으로 덮어쓰지 않도록 최신 선택에서 계산한다.
    setSelection(current => {
      const next = toggleCatalogComparison(current.comparison, key);
      return { ...current, comparison: next, options: [...new Set([...(current.options ?? []), ...next])] };
    });
  }

  // 이전 source=financial 주소도 공통 선택 상태로 복원한다. 이후 선택은 URL의 과거 ID로 덮어쓰지 않는다.
  useEffect(() => {
    if (!authInitialized || location.pathname !== '/vehicles/compare' || new URLSearchParams(location.search).get('source') !== 'financial') return;
    const state = readScopedFinancialState(location.state, memberId);
    const result = state?.recommendationResult ?? state?.result;
    if (!isFinancialRecommendationResult(result) || !state?.diagnosis?.values) return;
    const current = readScopedFinancialState(savedFinancialComparison, memberId);
    if (current && JSON.stringify(current.recommendationResult ?? current.result) === JSON.stringify(result)
      && JSON.stringify(current.diagnosis) === JSON.stringify(state.diagnosis)) return;
    const ids = [...new Set(new URLSearchParams(location.search).getAll('vehicle'))].slice(0, COMPARISON_LIMIT)
      .map(id => result.recommendations.find(item => String(item.vehicle.id) === id)?.vehicle.id).filter(id => id !== undefined);
    const scoped = scopeFinancialState({ result, recommendationResult: result, diagnosis: state.diagnosis, ids });
    setFinancialComparison(scoped);
    setSelection(current => ({ ...current, fromPreset: false, generalComparison: false, notice: '' }));
    try { sessionStorage.setItem(comparisonKey, JSON.stringify(scoped)); } catch { setStorageError('비교 목록은 이번 방문 중에만 유지됩니다.'); }
  }, [authInitialized, memberId, location.pathname, location.search, location.state, savedFinancialComparison]);
  return <VehicleContext.Provider value={{ vehicles, planningVehicles: catalog.planningVehicles, catalogStatus: catalog.status, catalogError: catalog.error, retryCatalog: () => { setCatalog({ status: 'loading', vehicles: [], planningVehicles: [], error: '' }); setAttempt((value) => value + 1); }, conditions, finance, comparisonMode: mode, comparisonOptions, comparisonNotice: selection.notice ?? '', setConditions, comparison, toggleComparison, financialComparison, toggleFinancialComparison, favoriteComparison, favorites, toggleFavorite, clearFavorites, reloadFavorites, favoritesReadFailed, authInitialized, memberId, storageError: storageError || favoritesError }}>{children}</VehicleContext.Provider>;
}
