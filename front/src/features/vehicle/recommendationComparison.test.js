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
  assert.deepEqual(restored.result.recommendations, result.recommendations.slice(0, 3));
  assert.deepEqual(restored.recommendationResult, result);
  assert.deepEqual(restored.diagnosis, diagnosis);
});

test('제외한 차량은 저장 데이터에서도 제거하고 마지막 차량을 빼면 목록을 비운다', () => {
  let saved = toggleRecommendationComparison(null, 1, result, diagnosis);
  saved = toggleRecommendationComparison(saved, 2, result, diagnosis);
  saved = toggleRecommendationComparison(saved, 1);
  assert.deepEqual(saved.ids, [2]);
  assert.deepEqual(saved.result.recommendations, [result.recommendations[1]]);
  assert.deepEqual(saved.recommendationResult, result);
  assert.equal(toggleRecommendationComparison(saved, 2), null);
  assert.equal(toggleRecommendationComparison(null, 99, result, diagnosis), null);
});
