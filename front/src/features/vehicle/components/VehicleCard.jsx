import { vehicleTrimOptions } from '../vehicleTrimOptions.js';
import { energyPrices, formatVehicleEfficiency } from '../vehicleEnergyPrices.js';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import VehicleArtwork from './VehicleArtwork';
import { formatAmount } from '../vehicleData';
import { Heart } from 'lucide-react';
import theme from '../../../styles/theme.js';
import { useVehicle } from '../useVehicle';
import { FAVORITES_LIMIT } from '../vehicleFavorites.js';

export default function VehicleCard({ model }) {
  const { favorites, toggleFavorite, authInitialized, favoritesReadFailed } = useVehicle();
  const [selectedId, setSelectedId] = useState(model.variants[0].id);
  const selectId = useId();
  const vehicle = model.variants.find(variant => variant.id === selectedId) ?? model.variants[0];
  const selected = favorites.includes(vehicle.id);
  // 한도가 찼거나 저장소를 읽지 못하면 누르지 못하는 이유를 카드 안에서 바로 보여 준다.
  const full = !selected && favorites.length >= FAVORITES_LIMIT;
  const otherTrims = model.variants.filter(variant => variant.id !== vehicle.id && favorites.includes(variant.id)).length;
  const favoriteLabel = selected ? '관심차량에 담김' : full ? `관심차량 ${FAVORITES_LIMIT}대 가득 참` : '관심차량에 담기';
  const favoriteHint = favoritesReadFailed ? '관심차량 저장소를 읽지 못했습니다.'
    : full ? '관심차량에서 차량을 삭제한 뒤 담아 주세요.'
    : otherTrims ? `이 모델의 다른 트림 ${otherTrims}개가 담겨 있습니다.` : '';
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
    <div className="vehicle-favorite-action">
      <button type="button" className="vehicle-favorite-toggle" aria-pressed={selected} disabled={!authInitialized || favoritesReadFailed || full}
        aria-label={`${model.name} ${vehicle.trim ?? ''} ${favoriteLabel}`} onClick={() => toggleFavorite(vehicle.id)}>
        <Heart size={theme.iconSize.sm} aria-hidden="true" fill={selected ? 'currentColor' : 'none'} />{favoriteLabel}
      </button>
      {favoriteHint && <small className="vehicle-favorite-hint">{favoriteHint}</small>}
    </div>
  </article>;
}
