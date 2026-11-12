import VehicleEnergyCostNote from '../../components/VehicleEnergyCostNote.jsx';
import { groupVehicleModels } from './groupVehicleModels.js';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import VehicleCard from '../../components/VehicleCard';
import { useVehicle } from '../../useVehicle';
import { calculateCosts } from '../../vehicleData';
import theme from '../../../../styles/theme';
import { useVehicleSearch } from './useVehicleSearch';
import '../../styles/VehiclePages.css';

function vehicleCategory({ type }) {
  if (type.includes('SUV') || type.includes('스포츠 유틸리티차')) return 'SUV';
  if (type.includes('세단') || type === 'SEDAN') return '세단';
  return type;
}

export function VehicleResultsPage() {
  const { vehicles, conditions } = useVehicle();
  const [params, setParams] = useSearchParams();
  function filter(key, value) { setParams(current => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true }); }
  const onlyFavorites = params.get('favorites') === '1';
  const keyword = params.get('q') ?? '';
  const category = params.get('category') ?? '전체';
  const setOnlyFavorites = value => filter('favorites', value ? '1' : '');
  const setKeyword = value => filter('q', value);
  const setCategory = value => filter('category', value === '전체' ? '' : value);
  const { favorites } = useVehicle();
  const search = useVehicleSearch(keyword);
  const categories = ['전체', ...new Set(vehicles.map(vehicleCategory))];
  const matched = vehicles.filter((vehicle) => (conditions.condition === '상관없음' || vehicle.condition === conditions.condition) && (!onlyFavorites || favorites.includes(vehicle.id)) && (category === '전체' || vehicleCategory(vehicle) === category));
  // 검색은 조건 결과 안에서 거르기만 하고, 순서는 추천 적합도 순을 유지한다
  const searchIds = search.ids && new Set(search.ids);
  const results = matched.filter((vehicle) => !searchIds || searchIds.has(vehicle.id) || keyword.trim().toLocaleLowerCase().split(/\s+/).every(word => `${vehicle.name} ${vehicle.catalogName} ${vehicle.type} ${vehicle.trim}`.toLocaleLowerCase().includes(word))).sort((a, b) => calculateCosts(b, conditions).score - calculateCosts(a, conditions).score);
  const models = groupVehicleModels(results).sort((a, b) => a.name.localeCompare(b.name, 'ko-KR', { numeric: true }));
  const searchStatus = search.failed ? '검색 서버에 연결할 수 없어 전체 추천 차량을 보여 드립니다.' : search.loading ? '검색 중입니다.' : '';
  function resetFilters() { setOnlyFavorites(false); setKeyword(''); setCategory('전체'); }
  return <div className="vehicle-page"><div className="vehicle-heading split"><div><h1>차량 찾기</h1><p>재무상태와 차량 이용 목적을 바탕으로 고른 추천 차량입니다.</p></div><span className="vehicle-badge">총 {models.length}개 모델 · {results.length}개 트림</span></div><div className="vehicle-content-fade"><section className="vehicle-search-panel panel" aria-label="차량 검색 조건"><fieldset className="vehicle-category-filter"><legend>차량 종류</legend><div>{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div></fieldset><div className="vehicle-toolbar"><label className="vehicle-keyword form-focus-group"><Search size={theme.iconSize.md} aria-hidden="true" /><span className="sr-only">차량 검색</span><input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="차명·브랜드·차종 검색" aria-describedby="vehicle-search-status" maxLength={50} /></label><label><input type="checkbox" checked={onlyFavorites} onChange={(event) => setOnlyFavorites(event.target.checked)} /> 관심 차량만 보기</label><Link className="vehicle-button primary" to="/vehicles/compare?source=favorites">관심 차량 비교</Link></div></section><p id="vehicle-search-status" className={search.failed ? 'vehicle-search-status vehicle-error' : 'vehicle-search-status'} role="status">{searchStatus}</p>{results.length ? <div className="vehicle-grid">{models.map(model => <VehicleCard key={model.key} model={model} />)}</div> : <div className="panel vehicle-empty"><h2>조건에 맞는 차량이 없습니다.</h2><p>검색어, 검색 조건이나 관심차량 필터를 변경해 주세요.</p><button className="vehicle-button" onClick={resetFilters}>전체 차량 보기</button></div>}<VehicleEnergyCostNote /></div></div>;
}
