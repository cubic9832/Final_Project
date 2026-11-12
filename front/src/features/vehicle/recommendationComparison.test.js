import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPARISON_LIMIT, toggleCatalogComparison, toggleRecommendationComparison } from './recommendationComparison.js';

const diagnosis = { values: { income: '300' } };
const result = { modelVersion: 'candidate-v2', recommendations: Array.from({ length: COMPARISON_LIMIT + 1 }, (_, index) => index + 1).map(id => ({ vehicle: { id, price: id * 10000000 }, cost: { monthly_running_cost: id * 100000 } })) };

const allIds = result.recommendations.map(item => item.vehicle.id);

test('추천 비교 목록은 사양과 비용을 저장하고 비교 한도까지만 담는다', () => {
  let saved = null;
  for (const id of allIds) saved = toggleRecommendationComparison(saved, id, result, diagnosis);
  const restored = JSON.parse(JSON.stringify(saved));
  assert.deepEqual(restored.ids, allIds.slice(0, COMPARISON_LIMIT));
  assert.deepEqual(restored.result.recommendations, result.recommendations);
  assert.deepEqual(restored.recommendationResult, result);
  assert.deepEqual(restored.diagnosis, diagnosis);
});

test('마지막 선택을 제외해도 추천 원본을 보존하고 다시 선택할 수 있다', () => {
  let saved = toggleRecommendationComparison(null, 1, result, diagnosis);
  saved = toggleRecommendationComparison(saved, 2, result, diagnosis);
  saved = toggleRecommendationComparison(saved, 1);
  assert.deepEqual(saved.ids, [2]);
  assert.deepEqual(saved.result.recommendations, result.recommendations);
  assert.deepEqual(saved.recommendationResult, result);
  saved = toggleRecommendationComparison(saved, '2');
  assert.deepEqual(saved.ids, []);
  saved = toggleRecommendationComparison(JSON.parse(JSON.stringify(saved)), '1');
  assert.deepEqual(saved.ids, [1]);
  assert.deepEqual(saved.result, result);
  assert.deepEqual(saved.diagnosis, diagnosis);
  assert.equal(toggleRecommendationComparison(null, 99, result, diagnosis), null);
});


test('선택 해제·재선택을 반복해도 비용과 원본 후보를 보존하고 한도를 넘는 선택을 거부한다', () => {
  let saved = null;
  for (const id of allIds.slice(0, COMPARISON_LIMIT)) saved = toggleRecommendationComparison(saved, id, result, diagnosis);
  saved = toggleRecommendationComparison(saved, '2');
  saved = toggleRecommendationComparison(JSON.parse(JSON.stringify(saved)), '2');
  assert.deepEqual(saved.ids, [...allIds.slice(0, COMPARISON_LIMIT).filter(id => id !== 2), 2]);
  assert.deepEqual(saved.result.recommendations[1].cost, result.recommendations[1].cost);
  assert.equal(toggleRecommendationComparison(saved, COMPARISON_LIMIT + 1), saved);
});

test('일반 비교는 문자열 ID로 정규화하고 한도에서 추가를 막되 해제는 허용한다', () => {
  let ids = [];
  for (const id of allIds) ids = toggleCatalogComparison(ids, id);
  assert.deepEqual(ids, allIds.slice(0, COMPARISON_LIMIT).map(String));
  ids = toggleCatalogComparison(ids, 3);
  assert.equal(ids.includes('3'), false);
  assert.deepEqual(toggleCatalogComparison(ids, COMPARISON_LIMIT + 1), [...ids, String(COMPARISON_LIMIT + 1)]);
});


test('새 진단에서는 이전 선택을 재사용하지 않고 새 비용의 추천으로 선택한다', () => {
  const previous = toggleRecommendationComparison(null, 1, result, diagnosis);
  const changed = { ...diagnosis, values: { income: '500' } };
  const newResult = { ...result, recommendations: result.recommendations.map(item => ({ ...item, cost: { monthly_running_cost: 500000 } })) };
  const next = toggleRecommendationComparison(previous, 1, newResult, changed);
  assert.deepEqual(next.ids, [1]);
  assert.equal(next.result.recommendations[0].cost.monthly_running_cost, 500000);
  assert.deepEqual(next.diagnosis, changed);
});
