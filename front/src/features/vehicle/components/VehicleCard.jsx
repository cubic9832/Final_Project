import { vehicleTrimOptions } from '../vehicleTrimOptions.js';
import { energyPrices, formatVehicleEfficiency } from '../vehicleEnergyPrices.js';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import VehicleArtwork from './VehicleArtwork';
import { formatAmount } from '../vehicleData';
import { useVehicle } from '../useVehicle';

export default function VehicleCard({ model }) {
  const { comparison, toggleComparison } = useVehicle();
  const [selectedId, setSelectedId] = useState(model.variants[0].id);
  const selectId = useId();
  const vehicle = model.variants.find(variant => variant.id === selectedId) ?? model.variants[0];
  const selected = comparison.includes(vehicle.id);
  return <article className="vehicle-card panel">
    <VehicleArtwork vehicle={{ ...vehicle, imageUrl: model.imageUrl }} />
    <Link className="vehicle-button vehicle-card-details" to={`/vehicles/${vehicle.id}`} aria-label={`${model.name} 선택한 트림 상세 보기`}>상세 보기</Link>
    <h3>{model.name}</h3>
    <div className="vehicle-trim-picker"><label htmlFor={selectId}>트림 모델 선택 · {model.variants.length}개</label>
      <select id={selectId} value={vehicle.id} onChange={event => setSelectedId(event.target.value)}>
        {vehicleTrimOptions(model.variants).map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
    </div>
    <p className="muted">{vehicle.type} · {energyPrices[vehicle.fuel]?.label ?? vehicle.fuel}</p>
    <div className="vehicle-metrics" aria-live="polite"><div><small>예상 차량가</small><strong>{formatAmount(vehicle.price)}</strong></div><div><small>{vehicle.fuel === 'ELECTRIC' ? '복합전비' : '복합연비'}</small><strong title={vehicle.efficiencyBasis}>{formatVehicleEfficiency(vehicle)}</strong></div></div>
    <label className="compare-check"><input type="checkbox" checked={selected} disabled={!selected && comparison.length >= 3} onChange={() => toggleComparison(vehicle.id)} />선택한 트림 비교에 추가</label>
  </article>;
}
