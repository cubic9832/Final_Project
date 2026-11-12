const sameId = (left, right) => String(left) === String(right);

// 선택 목록이 비어도 원본 추천과 진단은 재선택·화면 복귀를 위해 보존한다.
export function toggleRecommendationComparison(current, id, result, diagnosis) {
  const source = result ?? current?.recommendationResult ?? current?.result;
  const input = diagnosis ?? current?.diagnosis;
  if (!source?.recommendations || !input?.values) return current;
  const sameInput = !diagnosis || JSON.stringify(current?.diagnosis) === JSON.stringify(diagnosis);
  const ids = (sameInput ? current?.ids ?? [] : []).filter(value => source.recommendations.some(item => sameId(item.vehicle.id, value)));
  const candidate = source.recommendations.find(item => sameId(item.vehicle.id, id));
  if (!candidate) return current;
  const selected = ids.some(value => sameId(value, id));
  if (!selected && ids.length >= 3) return current;
  return { result: source, recommendationResult: source, diagnosis: input,
    ids: selected ? ids.filter(value => !sameId(value, id)) : [...ids, candidate.vehicle.id] };
}

export function toggleCatalogComparison(ids, id) {
  const key = String(id);
  const selected = ids.map(String);
  return selected.includes(key) ? selected.filter(value => value !== key)
    : selected.length < 3 ? [...selected, key] : selected;
}

// 일반 비교로 전환하면 선택은 유지하고 추천 원본 계산은 표에서 사용하지 않는다.
export function comparisonMode(fromPreset, generalComparison, financialComparison) {
  return !fromPreset && !generalComparison && financialComparison ? 'recommendation' : 'catalog';
}
