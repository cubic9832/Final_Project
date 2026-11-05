import { buildRecommendationView, describePreference } from '../../../financial/pages/recommendations/buildRecommendationView.js';
import VehicleEnergyCostNote from '../../components/VehicleEnergyCostNote.jsx';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import VehicleCatalogGate from '../../components/VehicleCatalogGate.jsx';
import FinancialCandidateComparison from '../../../financial/pages/recommendations/FinancialCandidateComparison.jsx';
import { useVehicle } from '../../useVehicle';
import { calculateCosts, formatAmount } from '../../vehicleData';
import { findProfilePreset } from '../../../preset/profilePresets';
import '../../styles/VehiclePages.css';

export default function VehicleComparePage() {
  const { state } = useLocation();
  const [params] = useSearchParams();
  if (params.get('source') === 'catalog' && !params.has('preset')) return <Navigate to='/vehicles/compare' replace state={state} />;
  if (params.get('source') === 'financial') return <FinancialCandidateComparison result={state?.recommendationResult} diagnosis={state?.diagnosis} selectedIds={params.getAll('vehicle')} />;
  return <VehicleCatalogGate><CatalogVehicleComparePage /></VehicleCatalogGate>;
}

function CatalogVehicleComparePage() {
  const { state } = useLocation();
  const [params] = useSearchParams();
  const presetId = params.get('preset');
  const preset = findProfilePreset(presetId);
  const { vehicles, planningVehicles, conditions, comparison, financialComparison } = useVehicle();
  const selected = comparison.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean);
  if (presetId !== null && !preset) return <section className="vehicle-page panel vehicle-empty"><h1>프로필을 찾을 수 없습니다.</h1><p>메인에서 예시 프로필을 다시 선택해 주세요.</p><Link className="vehicle-button primary" to="/">프리셋 선택하기</Link></section>;
  const recommendationViews = !preset && financialComparison
    ? buildRecommendationView(financialComparison.result)
    : [];
  const recommendationState = state?.result && state?.diagnosis ? state : financialComparison && {
    diagnosis: financialComparison.diagnosis,
    result: financialComparison.recommendationResult ?? financialComparison.result,
  };
  const catalogViews = selected.map(vehicle => {
    const specs = planningVehicles.find(item => item.id === vehicle.id);
    const costs = calculateCosts(vehicle, conditions);
    const monthlyCost = costs.total - costs.installment;
    const cashAfterPurchase = conditions.cash - Math.min(vehicle.price, conditions.downPayment);
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
  const comparisonViews = comparison.map(id =>
    recommendationViews.find(view => String(view.id) === id)
    ?? catalogViews.find(view => view.id === id)
  ).filter(Boolean);
  if (comparisonViews.length) return <FinancialCandidateComparison key={presetId} comparisonViews={comparisonViews}>
    <div className="financial-recommendations-actions">
      {selected.map(vehicle => <Link key={vehicle.id} className="candidate-open-comparison" to={`/vehicles/${vehicle.id}/simulation`}>{vehicle.name} 조건 시뮬레이션</Link>)}
    </div>
    <div className="financial-recommendations-actions">
      {!preset && recommendationState && <Link className="candidate-open-comparison" to="/financial/recommendations" state={recommendationState}>추천 결과로 돌아가기</Link>}
      <Link className="candidate-open-comparison" to="/financial">내 정보 입력하고 비교하기</Link>
    </div>
  </FinancialCandidateComparison>;
  return <div className="vehicle-page"><div className="vehicle-heading split"><div><h1>차량 비교</h1><p>최대 3대의 구매비용과 유지비, 재무 적합도를 같은 기준으로 비교합니다.</p></div><span className="vehicle-badge">{selected.length} / 3 선택</span></div><div className="vehicle-content-fade"><section className="panel vehicle-empty"><h2>비교할 차량을 선택해 주세요.</h2><p>추천 차량이나 차량 상세에서 최대 3대를 추가할 수 있습니다.</p><Link className="vehicle-button primary" to="/vehicles">차량 선택하기</Link></section><div className="vehicle-actions"><Link className="vehicle-button cta" to="/financial">내 정보 입력하고 비교하기</Link></div>{!preset && <VehicleEnergyCostNote />}</div></div>;
}
