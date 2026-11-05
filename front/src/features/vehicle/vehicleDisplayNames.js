const brandNames = { Porsche: '포르쉐', Ferrari: '페라리', Lamborghini: '람보르기니', MINI: '미니' };
const modelNames = {
  '12Cilindri': '12칠린드리', Amalfi: '아말피', 'Roma Spider': '로마 스파이더',
  Canyon: '캐니언', Sierra: '시에라', 'HUMMER EV SUV': '허머 EV SUV',
  Revuelto: '레부엘토', Temerario: '테메라리오', 'Cooper Convertible': '쿠퍼 컨버터블',
  GranCabrio: '그란카브리오', GranTurismo: '그란투리스모', 'E-Class': 'E-클래스',
  'Model Y': '모델 Y', Cayenne: '카이엔', Golf: '골프', 'Golf GTI': '골프 GTI',
  '308 SMART HYBRID': '308 스마트 하이브리드',
  'Electrified G80': 'G80 전동화 모델', 'Electrified GV70': 'GV70 전동화 모델',
};
export function koreanVehicleBrand(brand) { return brandNames[brand] ?? brand; }
export function koreanVehicleModel(model) {
  return modelNames[model] ?? model.replace(/Long Wheel Base/g, '롱휠베이스').replace(/Shooting Brake/g, '슈팅 브레이크').replace(/\bHybrid\b/g, '하이브리드').replace(/\bElectric\b/g, '일렉트릭').replace(/\bBlack\b/g, '블랙').replace(/\bCoupe\b/g, '쿠페');
}
export const vehicleBodyLabels = {
  HATCHBACK: '해치백', BOX: '박스형', PICKUP: '픽업트럭', COUPE: '쿠페',
  CONVERTIBLE: '컨버터블', WAGON: '왜건', ROADSTER: '로드스터', SEDAN: '세단',
  SUV: 'SUV',
};
