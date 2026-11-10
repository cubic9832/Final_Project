export function toggleRecommendationComparison(current, id, result, diagnosis) {
  const ids = current?.ids ?? [];
  if (ids.includes(id)) {
    const remaining = ids.filter(value => value !== id);
    return remaining.length ? { ...current, ids: remaining, result: { ...current.result, recommendations: current.result.recommendations.filter(candidate => remaining.includes(candidate.vehicle.id)) } } : null;
  }
  const candidate = result?.recommendations.find(item => item.vehicle.id === id);
  if (ids.length >= 3 || !candidate || !diagnosis?.values) return current;
  const recommendations = [...(current?.result.recommendations ?? []).filter(item => ids.includes(item.vehicle.id)), candidate];
  return { result: { ...result, recommendations }, recommendationResult: result, diagnosis, ids: [...ids, id] };
}
