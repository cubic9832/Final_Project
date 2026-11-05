import test from 'node:test';
import assert from 'node:assert/strict';
import { groupVehicleModels } from './pages/results/groupVehicleModels.js';

test('모델 병합은 트림 ID·가격·순서를 보존하고 다른 브랜드·모델은 분리한다', () => {
  const vehicles = [
    { id: 'morning-a', brand: '기아', name: '기아 모닝', trim: '트렌디', price: 1386, imageUrl: '/old-a.webp' },
    { id: 'ray', brand: '기아', name: '기아 레이', trim: '트렌디', price: 1555 },
    { id: 'morning-b', brand: '기아', name: '기아 모닝 ', trim: '시그니처', price: 1816, imageUrl: '/old-b.webp' },
    { id: 'other', brand: '다른 브랜드', name: '기아 모닝', price: 2000 },
  ];
  const groups = groupVehicleModels(vehicles);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups[0].variants, [vehicles[0], vehicles[2]]);
  assert.equal(groups[0].imageUrl, '/images/recommendations/cutouts/morning.webp');
  assert.deepEqual(groups.slice(1).map(group => group.variants[0].id), ['ray', 'other']);
  assert.equal(vehicles[0].imageUrl, '/old-a.webp');
  assert.deepEqual(groupVehicleModels([]), []);
});
