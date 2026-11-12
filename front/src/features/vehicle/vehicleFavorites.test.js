import test from 'node:test';
import assert from 'node:assert/strict';
import { clearVehicleFavorites, readVehicleFavorites, writeVehicleFavorites } from './vehicleFavorites.js';

test('비회원·A·B 계정 전환과 새로 읽기에서 관심 차량을 격리한다', () => {
  const entries = new Map([['vehicle-favorites', '["unknown-owner"]']]);
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  assert.deepEqual(readVehicleFavorites(storage, null), []);
  writeVehicleFavorites(storage, null, ['guest-car']);
  assert.deepEqual(readVehicleFavorites(storage, 1), []);
  writeVehicleFavorites(storage, 1, ['A-car']);
  assert.deepEqual(readVehicleFavorites(storage, null), ['guest-car']);
  assert.deepEqual(readVehicleFavorites(storage, 2), []);
  writeVehicleFavorites(storage, 2, ['B-car']);
  assert.deepEqual(readVehicleFavorites(storage, 1), ['A-car']);
  clearVehicleFavorites(storage, 1);
  assert.deepEqual(readVehicleFavorites(storage, 1), []);
  assert.deepEqual(readVehicleFavorites(storage, 2), ['B-car']);
  assert.equal(entries.get('vehicle-favorites'), '["unknown-owner"]');
});

test('저장소 실패와 손상된 관심 차량 기록을 성공한 빈 목록으로 처리하지 않는다', () => {
  assert.throws(() => readVehicleFavorites({ getItem: () => '{invalid' }, 1));
  assert.throws(() => readVehicleFavorites({ getItem: () => '[1]' }, 1));
  assert.throws(() => writeVehicleFavorites({ setItem: () => { throw new Error('quota'); } }, 1, ['car']));
});
