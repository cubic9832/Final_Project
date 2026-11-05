import test from 'node:test';
import assert from 'node:assert/strict';
import { accelerationDescription, seatingDescription } from './pages/recommendations/vehiclePreferenceDetails.js';

test('좌석 확정값과 선택 가능한 정원을 구분하고 숫자 문자열도 표시한다', () => {
  assert.equal(seatingDescription('7', [7, 9]), '7·9명 구성');
  assert.equal(seatingDescription(null, [9, '7', 9, null]), '7·9명 구성');
  assert.equal(seatingDescription(null, [], '정원 확인 필요'), '정원 확인 필요');
});

test('합성 가속 시간은 측정 제원으로 표시하지 않고 기존 성향 점수를 사용한다', () => {
  assert.deepEqual(accelerationDescription(12, .5, { kind:'estimated-acceleration' }), ['가속 성향','균형 잡힌 가속']);
  assert.deepEqual(accelerationDescription(undefined, 1), ['가속 성향','강하고 빠른 가속']);
  assert.deepEqual(accelerationDescription(undefined, 0), ['가속 성향','부드럽고 완만한 가속']);
  assert.deepEqual(accelerationDescription('7.2', .5, { kind:'official-specification' }), ['가속 성능','0–100km/h 약 7.2초']);
  assert.deepEqual(accelerationDescription(null, null), ['가속 성능','정보 준비 중']);
});
