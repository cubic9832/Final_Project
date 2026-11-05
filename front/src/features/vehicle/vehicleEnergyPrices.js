// 조회일 기준 스냅샷. 실시간 가격 또는 모든 충전사업자의 요금이 아니다.
export const energyPriceCheckedOn = '2026-11-05';
export const energyPrices = {
  GASOLINE: { price: 1855.25, unit: 'L', label: '휘발유' },
  HYBRID: { price: 1855.25, unit: 'L', label: '하이브리드(휘발유)' },
  DIESEL: { price: 1841.54, unit: 'L', label: '경유' },
  LPG: { price: 1177.33, unit: 'L', label: 'LPG' },
  ELECTRIC: { price: 295, unit: 'kWh', label: '전기' },
  HYDROGEN: { price: 10361, unit: 'kg', label: '수소' },
};
export const energyPriceSources = [
  { label: '오피넷 전국 평균 재게시 자료', href: 'https://fuel.fazr.co.kr/' },
  { label: '무공해차 통합누리집 차량 비교 기준', href: 'https://ev.or.kr/nportal/buySupprt/initCarCompareAction.do' },
];
export function formatVehicleEfficiency(vehicle) {
  const unit = vehicle.efficiencyUnit ?? 'km/L';
  if (!(vehicle.efficiency > 0)) return '미등록';
  return `${vehicle.efficiency}${unit}${vehicle.efficiencyEstimated ? ' (추정)' : ''}`;
}
