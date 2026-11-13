import { Link } from 'react-router-dom';
import { Check, Info, Plus, X } from 'lucide-react';
import theme from '../../../styles/theme.js';
import { useVehicle } from '../useVehicle.js';
import { FAVORITES_LIMIT } from '../vehicleFavorites.js';
import { COMPARISON_LIMIT } from '../recommendationComparison.js';
import './VehicleFavoritesPanel.css';

// 비교 선택 토글을 아이콘이 있는 클릭 카드로 보여 준다. 프리셋 비교 토글도 같은 모양을 쓴다.
export function VehicleSelectCard({ name, detail, selected, disabled, onToggle, children }) {
  const Icon = selected ? Check : Plus;
  return <div className="vehicle-select-item">
    <button type="button" className="vehicle-select-card" aria-pressed={selected} disabled={disabled} onClick={onToggle}
      title={disabled && !selected ? `비교는 최대 ${COMPARISON_LIMIT}대까지 가능합니다.` : undefined}>
      <span className="vehicle-select-icon"><Icon size={theme.iconSize.sm} aria-hidden="true" /></span>
      <span className="vehicle-select-text"><strong>{name}</strong>{detail && <small>{detail}</small>}</span>
      <span className="sr-only">{selected ? '비교 선택됨' : '비교에 추가'}</span>
    </button>
    {children}
  </div>;
}

// summary: 차량 찾기·내 정보에서 관심차량을 확인한다. selector: 차량 비교 카드 안에서 비교할 차량을 고른다.
export default function VehicleFavoritesPanel({ variant = 'summary', className = '', actions }) {
  const { favorites, vehicles, financialComparison, comparison, toggleComparison, toggleFavorite, catalogStatus, catalogError, retryCatalog, storageError, favoritesReadFailed, reloadFavorites, authInitialized, memberId } = useVehicle();
  const isSelector = variant === 'selector';
  const title = isSelector ? '비교할 차량' : '관심차량';
  const rootClass = ['vehicle-favorites-panel', `vehicle-favorites-${variant}`, isSelector || className ? '' : 'panel', className].filter(Boolean).join(' ');
  const defaultActions = <>
    <Link className={isSelector ? 'vehicle-button primary' : 'vehicle-button'} to="/search">차량 찾기</Link>
    {!isSelector && <Link className="vehicle-button primary" to="/vehicles/compare">차량 비교</Link>}
  </>;
  return <section className={rootClass} aria-label={title}>
    <div className="vehicle-favorites-head">
      <h2>{title}</h2>
      <div className="vehicle-count-chips" aria-live="polite">
        <span className="vehicle-count-chip">관심차량 {favorites.length}/{FAVORITES_LIMIT}</span>
        <span className="vehicle-count-chip">비교 선택 {comparison.length}/{COMPARISON_LIMIT}</span>
      </div>
    </div>
    <p className="vehicle-favorites-note">{memberId == null ? '비로그인 관심차량은 이 브라우저에 저장되며 사이트 데이터 삭제 시 사라집니다. 로그인 시 회원 목록과 자동으로 합치지 않습니다.' : '현재 브라우저에 회원별로 저장됩니다. 카드를 누르면 비교에 추가하거나 뺄 수 있습니다.'}</p>
    {!authInitialized || catalogStatus === 'loading' ? <p role="status">관심차량을 불러오는 중입니다.</p> : null}
    {catalogStatus === 'error' && <p role="alert">{catalogError} <button type="button" className="vehicle-button" onClick={retryCatalog}>다시 시도</button></p>}
    {storageError && <p role="status">{storageError}</p>}
    {favoritesReadFailed && <button type="button" className="vehicle-button" onClick={reloadFavorites}>저장소 다시 읽기</button>}
    {authInitialized && !favoritesReadFailed && !favorites.length && <p className="vehicle-favorites-empty">아직 담은 관심차량이 없습니다. 차량 찾기나 추천 결과에서 차량을 담아 주세요.</p>}
    {favorites.length > 0 && <ul className="vehicle-select-list">{favorites.map(id => {
      const vehicle = vehicles.find(item => item.id === id);
      const candidate = financialComparison?.result?.recommendations.find(item => String(item.vehicle.id) === id)?.vehicle;
      const name = vehicle?.name ?? (candidate ? `${candidate.brand} ${candidate.model}` : `차량 정보 확인 불가 (${id})`);
      const selected = comparison.includes(id);
      return <li key={id}>
        <VehicleSelectCard name={name} detail={vehicle?.trim ?? candidate?.trim} selected={selected}
          disabled={!authInitialized || (!vehicle && !candidate) || (!selected && comparison.length >= COMPARISON_LIMIT)}
          onToggle={() => toggleComparison(id)}>
          {vehicle && <Link className="vehicle-icon-button" to={`/vehicles/${id}`} aria-label={`${name} 상세 보기`} title="상세 보기"><Info size={theme.iconSize.sm} aria-hidden="true" /></Link>}
          <button type="button" className="vehicle-icon-button danger" onClick={() => toggleFavorite(id)} aria-label={`${name} 관심차량 삭제`} title="관심차량 삭제"><X size={theme.iconSize.sm} aria-hidden="true" /></button>
        </VehicleSelectCard>
      </li>;
    })}</ul>}
    {(!isSelector || !favorites.length) && <div className="vehicle-favorites-actions">{actions ?? defaultActions}</div>}
  </section>;
}
