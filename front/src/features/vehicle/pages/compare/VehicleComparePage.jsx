import VehicleEnergyCostNote from '../../components/VehicleEnergyCostNote.jsx';
import { formatVehicleEfficiency } from '../../vehicleEnergyPrices.js';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import VehicleCatalogGate from '../../components/VehicleCatalogGate.jsx';
import FinancialCandidateComparison from '../../../financial/pages/recommendations/FinancialCandidateComparison.jsx';
import { useVehicle } from '../../useVehicle';
import { calculateCosts, formatAmount } from '../../vehicleData';
import VehicleArtwork from '../../components/VehicleArtwork';
import { findProfilePreset } from '../../../preset/profilePresets';
import '../../styles/VehiclePages.css';

export default function VehicleComparePage() {
  const { state } = useLocation();
  const [params] = useSearchParams();
  const { financialComparison } = useVehicle();
  if (!params.has('preset') && financialComparison?.ids.length) {
    const { result, recommendationResult, diagnosis, ids } = financialComparison;
    const recommendationState = state?.result && state?.diagnosis
      ? state
      : recommendationResult && { diagnosis, result: recommendationResult };
    return <FinancialCandidateComparison result={result} diagnosis={diagnosis} selectedIds={ids} canToggleVehicles recommendationState={recommendationState} />;
  }
  if (params.get('source') === 'financial') return <FinancialCandidateComparison result={state?.recommendationResult} diagnosis={state?.diagnosis} selectedIds={params.getAll('vehicle')} />;
  return <VehicleCatalogGate><CatalogVehicleComparePage /></VehicleCatalogGate>;
}

function CatalogVehicleComparePage() {
  const [params] = useSearchParams();
  const presetId = params.get('preset');
  const preset = findProfilePreset(presetId);
  const { vehicles, planningVehicles, conditions, comparison, toggleComparison } = useVehicle();
  const selected = comparison.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean);
  const rows = [['차량 가격', (v) => formatAmount(v.price)], ['선수금', () => formatAmount(conditions.downPayment)], ['월 할부금', (_, c) => formatAmount(c.installment)], ['복합 연비·전비', (v) => formatVehicleEfficiency(v)], ['월 연료·충전비', (_, c) => formatAmount(c.fuel)], ['월 보험료', (_, c) => formatAmount(c.insurance)], ['월 세금', (_, c) => formatAmount(c.tax)], ['월 정비비', (_, c) => formatAmount(c.maintenance)], ['월 총비용', (_, c) => formatAmount(c.total)], ['3년 총비용', (_, c) => formatAmount(conditions.downPayment + c.total * 36)], ['구매 후 월 가용자금', (_, c) => formatAmount(c.remaining)], ['재무 적합도', (_, c) => `${c.score}%`]];
  if (presetId !== null && !preset) return <section className="vehicle-page panel vehicle-empty"><h1>프로필을 찾을 수 없습니다.</h1><p>메인에서 예시 프로필을 다시 선택해 주세요.</p><Link className="vehicle-button primary" to="/">프리셋 선택하기</Link></section>;
  const presetViews = preset ? selected.map(vehicle => {
    const specs = planningVehicles.find(item => item.id === vehicle.id);
    const costs = calculateCosts(vehicle, conditions);
    const monthlyCost = costs.total - costs.installment;
    const cashAfterPurchase = preset.assets - Math.min(vehicle.price, conditions.downPayment);
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
      matches: [],
      mismatches: [],
      unknowns: [],
    };
  }) : [];
  if (preset && presetViews.length) return <FinancialCandidateComparison key={presetId} presetViews={presetViews}>
    <div className="financial-recommendations-actions">
      {selected.map(vehicle => <Link key={vehicle.id} className="candidate-open-comparison" to={`/vehicles/${vehicle.id}/simulation`}>{vehicle.name} 조건 시뮬레이션</Link>)}
      <Link className="candidate-open-comparison" to="/financial">내 정보 입력하고 비교하기</Link>
    </div>
  </FinancialCandidateComparison>;
  return <div className="vehicle-page"><div className="vehicle-heading split"><div><h1>차량 비교</h1><p>최대 3대의 구매비용과 유지비, 재무 적합도를 같은 기준으로 비교합니다.</p></div><span className="vehicle-badge">{selected.length} / 3 선택</span></div>{selected.length ? <><div className="vehicle-table-wrap"><table className="vehicle-table"><caption className="sr-only">선택한 차량의 구매 및 유지비 비교</caption><thead><tr><th scope="col" className="comparison-title"><small>비교 기준</small><h2>{preset ? '예시 프로필로 계산한' : '내 조건으로 계산한'}<br />예상 비용</h2></th>{selected.map((v) => <th scope="col" key={v.id}><Link to={`/vehicles/${v.id}`}><VehicleArtwork vehicle={v} photo /><h3>{v.name}</h3></Link><small>{v.trim}</small><button className="vehicle-button" onClick={() => toggleComparison(v.id)} aria-label={`${v.name} 비교에서 제외`}>제외</button></th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{selected.map((v) => <td key={v.id}>{value(v, calculateCosts(v, conditions))}</td>)}</tr>)}</tbody></table></div><div className="vehicle-note"><strong>비교 기준</strong><p>선수금 {formatAmount(conditions.downPayment)}, 48개월 할부, 금리 5.5%, 연간 주행 15,000km를 동일하게 적용했습니다. 3년 총비용은 선수금과 36개월 지출의 합입니다.</p></div><div className="vehicle-actions"><Link className="vehicle-button" to="/vehicles">차량 다시 선택</Link>{selected.map((v) => <Link key={v.id} className="vehicle-button primary" to={`/vehicles/${v.id}/simulation`}>{v.name} 조건 시뮬레이션</Link>)}</div></> : <section className="panel vehicle-empty"><h2>비교할 차량을 선택해 주세요.</h2><p>추천 차량이나 차량 상세에서 최대 3대를 추가할 수 있습니다.</p><Link className="vehicle-button primary" to="/vehicles">차량 선택하기</Link></section>}<div className="vehicle-actions"><Link className="vehicle-button cta" to="/financial">내 정보 입력하고 비교하기</Link></div>{!preset && <VehicleEnergyCostNote />}</div>;
}
