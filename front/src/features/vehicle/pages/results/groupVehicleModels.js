import { recommendationImages } from '../../recommendationImages.js';

const representativeImages = {
  '기아 PV5 패신저': '/images/vehicle-search/kia-pv5-passenger-front.png',
  '현대 더 뉴 스타리아': '/images/vehicle-search/hyundai-staria-front.png',
  '현대 아이오닉 9': '/images/vehicle-search/hyundai-ioniq9-front.png',
  '현대 넥쏘': '/images/vehicle-search/hyundai-nexo-front.png',
  'Porsche 911 타르가': '/images/vehicle-search/porsche-911-targa-front.png',
  'Porsche 911 카브리올레': '/images/vehicle-search/porsche-911-cabriolet-front.png',
  'Porsche 911 쿠페': '/images/vehicle-search/porsche-911-coupe-front.png',
  '기아 모닝': recommendationImages.OWN005.src,
  '토요타 알파드': '/images/vehicle-search/alphard-front.webp',
  '토요타 시에나': '/images/vehicle-search/sienna-front.webp',
  '현대 아반떼 하이브리드': recommendationImages.OWN011.src,
};

export function groupVehicleModels(vehicles) {
  const groups = new Map();
  for (const vehicle of vehicles) {
    const key = `${vehicle.brand.trim()}::${vehicle.name.trim().replace(/\s+/g, ' ')}`;
    if (!groups.has(key)) groups.set(key, { key, name: vehicle.name, imageUrl: representativeImages[(vehicle.catalogName ?? vehicle.name).trim()] ?? vehicle.imageUrl, variants: [] });
    groups.get(key).variants.push(vehicle);
  }
  return [...groups.values()];
}
