import { sortTableRows } from '../adminTableData.js';

export const fuelLabels = { GASOLINE: '가솔린', HYBRID: '하이브리드', DIESEL: '디젤', LPG: 'LPG', ELECTRIC: '전기' };
export const seatStatusLabels = {
  'user-provided': '제조사 확인 전 (제공 목록 기준)',
  'official-reference-conflict': '제조사 자료와 다름',
  'official-reference': '제조사 자료 기준',
  'official-source-verified': '제조사 출처 확인',
  'official-body-reference': '제조사 차체 자료 기준',
};
export const qualityLabels = {
  'automatically-extracted-snapshot': '가격표에서 자동 추출',
  'legacy-price-snapshot': '예전 가격 자료',
  'official-source-checked-supplement': '제조사 출처 확인 후 보충',
};
export const needsSeatCheck = car => !car.seatsStatus?.startsWith('official-') || car.seatsStatus === 'official-reference-conflict';
export const seatCheckLabel = car => needsSeatCheck(car) ? '정원 확인 필요' : '정원 확인 완료';
const normalize = value => String(value ?? '').toLocaleLowerCase('ko-KR').replace(/\s+/g, '');

export function filterCandidates(candidates, keyword) {
  const terms = keyword.trim().split(/\s+/).filter(Boolean).map(normalize);
  return candidates.filter(car => {
    const text = normalize([car.brand, car.model, car.trim, car.year, car.fuel, fuelLabels[car.fuel],
      seatCheckLabel(car), seatStatusLabels[car.seatsStatus], car.checkedOn,
      car.image ? '이미지 있음' : '이미지 없음'].join(' '));
    return terms.every(term => text.includes(term));
  });
}

export function candidateCounts(candidates) {
  const modelKey = car => JSON.stringify([car.brand, car.model]);
  return {
    models: new Set(candidates.map(modelKey)).size,
    noImage: new Set(candidates.filter(car => !car.image).map(modelKey)).size,
    seatCheck: candidates.filter(needsSeatCheck).length,
  };
}

const numeric = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const sortValues = {
  number: car => car.listNumber,
  vehicle: car => [car.brand, car.model, car.trim].filter(Boolean).join(' '),
  year: car => numeric(car.year),
  fuel: car => fuelLabels[car.fuel] ?? car.fuel,
  price: car => numeric(car.price),
  status: seatCheckLabel,
  checkedOn: car => car.checkedOn || null,
};

export function sortCandidates(candidates, sort) {
  return sortTableRows(candidates, sort, sortValues);
}
