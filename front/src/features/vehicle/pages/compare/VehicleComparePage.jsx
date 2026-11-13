import { purchaseScenario } from '../../purchaseScenario.js';
import VehicleFavoritesPanel from '../../components/VehicleFavoritesPanel.jsx';
import useAuthStore from '../../../../stores/useAuthStore.js';
import { readScopedFinancialState, scopeFinancialState } from '../../../financial/financialSession.js';
import { buildRecommendationView, describePreference } from '../../../financial/pages/recommendations/buildRecommendationView.js';
import VehicleEnergyCostNote from '../../components/VehicleEnergyCostNote.jsx';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import VehicleCatalogGate from '../../components/VehicleCatalogGate.jsx';
import FinancialCandidateComparison from '../../../financial/pages/recommendations/FinancialCandidateComparison.jsx';
import { useVehicle } from '../../useVehicle';
import { calculateCosts, formatAmount } from '../../vehicleData';
import { COMPARISON_LIMIT } from '../../recommendationComparison.js';
import { findProfilePreset } from '../../../preset/profilePresets';
import '../../styles/VehiclePages.css';

export default function VehicleComparePage() {
  const { state: routeState } = useLocation();
  const member = useAuthStore(store => store.member);
  const state = readScopedFinancialState(routeState, member?.id ?? null);
  const [params] = useSearchParams();
  // 이전 차량 목록·관심차량 비교 주소도 하나의 차량 비교 화면으로 연다.
  if (['catalog', 'favorites'].includes(params.get('source')) && !params.has('preset')) return <Navigate to='/vehicles/compare' replace state={state} />;
  return <VehicleCatalogGate><CatalogVehicleComparePage /></VehicleCatalogGate>;
}

function CatalogVehicleComparePage() {
  const { state: routeState } = useLocation();
  const member = useAuthStore(store => store.member);
  const state = readScopedFinancialState(routeState, member?.id ?? null);
  const [params] = useSearchParams();
  const presetId = params.get('preset');
  const preset = findProfilePreset(presetId);
  const { vehicles, planningVehicles, conditions, finance, comparisonMode, comparisonOptions, comparisonNotice, comparison, favorites, financialComparison } = useVehicle();
  const availableVehicles = comparisonOptions.map(id => vehicles.find(vehicle => vehicle.id === id)).filter(Boolean);
  const selected = comparison.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean);
  // 예시 프리셋은 관심차량에 저장하지 않으므로 프리셋 차량 안에서만 고른다.
  const selector = !preset && <VehicleFavoritesPanel variant="selector" />;
  // 관심차량 선택 카드에 개수가 보이므로 헤더 배지는 프리셋 비교에서만 쓴다.
  const badges = preset && <span className="vehicle-badge">비교 선택 {comparison.length} / {COMPARISON_LIMIT}</span>;
  if (presetId !== null && !preset) return <section className="vehicle-page panel vehicle-empty"><h1>프로필을 찾을 수 없습니다.</h1><p>메인에서 예시 프로필을 다시 선택해 주세요.</p><Link className="vehicle-button primary" to="/">프리셋 선택하기</Link></section>;
  const recommendationViews = !preset && comparisonMode === 'recommendation' && financialComparison
    ? buildRecommendationView(financialComparison.result)
    : [];
  const recommendationState = state?.result && state?.diagnosis ? state : financialComparison && {
    diagnosis: financialComparison.diagnosis,
    result: financialComparison.recommendationResult ?? financialComparison.result,
  };
  const catalogViews = availableVehicles.map(vehicle => {
    const specs = planningVehicles.find(item => item.id === vehicle.id);
    const costs = calculateCosts(vehicle, conditions, finance);
    const monthlyCost = Math.round((costs.total - costs.installment) * 10000) / 10000;
    const cashAfterPurchase = costs.cashRemaining;
    const preferences = preset ? undefined : recommendationState?.diagnosis?.vehicle;
    const fuelCodes = { 가솔린: 'GASOLINE', 휘발유: 'GASOLINE', 하이브리드: 'HYBRID', 디젤: 'DIESEL', 경유: 'DIESEL', LPG: 'LPG', 전기: 'ELECTRIC' };
    const criteria = [
      { key: 'fuel', requested: fuelCodes[preferences?.fuel], actual: vehicle.fuel },
      { key: 'body', requested: preferences?.preferredBodyType === 'any' ? null : preferences?.preferredBodyType, actual: specs?.body_type },
      { key: 'seating', requested: Number(preferences?.minimumSeats) || null, actual: specs?.seats },
    ].filter(item => item.requested).map(item => {
      const matches = item.key === 'seating' ? item.actual >= item.requested : item.actual === item.requested;
      return describePreference({
        ...item,
        status: !item.actual ? 'unknown' : matches ? 'match' : 'mismatch',
        difference: item.requested - item.actual,
      });
    });
    return {
      id: vehicle.id,
      candidate: {
        vehicle: { ...vehicle, model: vehicle.model ?? (vehicle.name.startsWith(vehicle.brand + ' ') ? vehicle.name.slice(vehicle.brand.length + 1) : vehicle.name), length_mm: specs?.length_mm },
        cost: {
          total_purchase_cost: vehicle.price * 10000,
          monthly_payment: costs.installment * 10000,
          monthly_running_cost: monthlyCost * 10000,
          remaining_monthly: costs.remaining * 10000,
        },
      },
      purchasePrice: formatAmount(vehicle.price),
      monthlyPayment: formatAmount(costs.installment),
      monthlyCost: formatAmount(monthlyCost),
      financial: { cashAfterPurchase: cashAfterPurchase * 10000 },
      cashRemaining: formatAmount(cashAfterPurchase),
      monthlyRemaining: formatAmount(costs.remaining),
      fuel: { GASOLINE: '휘발유', HYBRID: '하이브리드', DIESEL: '경유', LPG: 'LPG', ELECTRIC: '전기', HYDROGEN: '수소' }[vehicle.fuel] ?? '미확인',
      body: vehicle.type,
      length: specs?.length_mm ? `${specs.length_mm / 1000}m` : '미확인',
      seats: specs?.seats ? `${specs.seats}명` : '미확인',
      matches: criteria.filter(item => item.status === 'match'),
      mismatches: criteria.filter(item => item.status === 'mismatch'),
      unknowns: criteria.filter(item => item.status === 'unknown'),
    };
  });
  const comparisonViews = recommendationViews.length ? recommendationViews : catalogViews;
  if (comparisonViews.length) return <FinancialCandidateComparison key={presetId} comparisonViews={comparisonViews} selectedIds={comparison} canToggleVehicles={Boolean(preset)} controls={badges} selector={selector}>
    {comparisonNotice && <p role="status">{comparisonNotice}</p>}
    <p>{comparisonMode === 'recommendation' ? '추천 비교 · 추천 결과의 진단 조건과 비용을 사용합니다.' : `일반 비교 · 모든 차량에 공통 ${finance.months}개월·연 ${finance.rate}% 조건을 적용합니다.`}</p>
    {/* 최대 10대의 시뮬레이션 링크를 한 줄 칩으로 모아 높이를 고정한다. */}
    {selected.length > 0 && <nav className="comparison-simulation-links" aria-label="차량별 조건 시뮬레이션">
      <span className="comparison-simulation-label">조건 시뮬레이션</span>
      <div className="comparison-simulation-scroll">
        {selected.map(vehicle => <Link key={vehicle.id} className="comparison-simulation-link" aria-label={`${vehicle.name} 조건 시뮬레이션`} to={`/vehicles/${vehicle.id}/simulation`} state={scopeFinancialState({ purchaseScenario: purchaseScenario(vehicle, conditions, comparisonMode === 'recommendation' ? financialComparison : null, finance) })}>{vehicle.name}</Link>)}
      </div>
    </nav>}
    <div className="financial-recommendations-actions">
      {!preset && recommendationState && <Link className="candidate-open-comparison" to="/financial/recommendations" state={scopeFinancialState(recommendationState)}>추천 결과로 돌아가기</Link>}
      <Link className="candidate-open-comparison" to="/financial">내 정보 입력하고 비교하기</Link>
    </div>
  </FinancialCandidateComparison>;
  return <div className="vehicle-page"><div className="vehicle-heading split"><div><h1>차량 비교</h1><p>관심차량 중 최대 {COMPARISON_LIMIT}대를 골라 구매비용과 유지비, 재무 적합도를 같은 기준으로 비교합니다.</p></div>{badges}</div><div className="vehicle-content-fade">
    <section className="comparison-board" aria-label="차량 비교">
      {selector}
      {favorites.length > 0 && <div className="comparison-board-table"><div className="comparison-board-empty"><h2>비교할 차량을 선택해 주세요.</h2><p>위 차량 카드를 누르면 비교표가 표시됩니다.</p></div></div>}
    </section>
    <div className="vehicle-actions"><Link className="vehicle-button cta" to="/financial">내 정보 입력하고 비교하기</Link></div>{!preset && <VehicleEnergyCostNote />}</div></div>;
}
