import { energyPriceCheckedOn, energyPrices, energyPriceSources } from '../vehicleEnergyPrices.js';

export default function VehicleEnergyCostNote() {
  return <details className="vehicle-note vehicle-energy-note"><summary>연료·충전비 계산 기준 ({energyPriceCheckedOn} 조회)</summary>
    <p>월 에너지비 = 연간 주행거리 ÷ 12 ÷ 연비·전비 × 연료별 단가. 아래 단가를 고정 적용하며 실시간으로 갱신하지 않습니다.</p>
    <p>{['GASOLINE', 'DIESEL', 'LPG', 'ELECTRIC', 'HYDROGEN'].map(fuel => { const item = energyPrices[fuel]; return `${item.label} ${item.price.toLocaleString('ko-KR')}원/${item.unit}`; }).join(' · ')}</p>
    <p>휘발유·경유·LPG는 전국 평균, 전기·수소는 공공 차량 비교 기준 단가입니다. 실제 주유소·충전소 요금과 다를 수 있습니다. 제원이 없을 때 사용하는 계획용 연비·전비는 ‘추정’으로 표시합니다.</p>
    <p>{energyPriceSources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.label} </a>)}</p>
  </details>;
}
