import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleRecommendationComparison } from './recommendationComparison.js';

const diagnosis = { values: { income: '300' } };
const result = { modelVersion: 'candidate-v2', recommendations: [1, 2, 3, 4].map(id => ({ vehicle: { id, price: id * 10000000 }, cost: { monthly_running_cost: id * 100000 } })) };

test('추천 비교 목록은 사양과 비용을 저장하고 최대 세 대까지 담는다', () => {
  let saved = null;
  for (const id of [1, 2, 3, 4]) saved = toggleRecommendationComparison(saved, id, result, diagnosis);
  const restored = JSON.parse(JSON.stringify(saved));
  assert.deepEqual(restored.ids, [1, 2, 3]);
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


test('선택 해제·재선택을 반복해도 비용과 원본 후보를 보존하고 네 번째 선택을 거부한다', () => {
  let saved = null;
  for (const id of [1, 2, 3]) saved = toggleRecommendationComparison(saved, id, result, diagnosis);
  saved = toggleRecommendationComparison(saved, '2');
  saved = toggleRecommendationComparison(JSON.parse(JSON.stringify(saved)), '2');
  assert.deepEqual(saved.ids, [1, 3, 2]);
  assert.deepEqual(saved.result.recommendations[1].cost, result.recommendations[1].cost);
  assert.equal(toggleRecommendationComparison(saved, 4), saved);
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
