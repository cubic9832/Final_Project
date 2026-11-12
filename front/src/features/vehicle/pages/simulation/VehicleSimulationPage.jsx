import { readScopedFinancialState, scopeFinancialState } from '../../../financial/financialSession.js';
import { purchaseScenario } from '../../purchaseScenario.js';
import FinancialMoneyInput from '../../../financial/components/FinancialMoneyInput.jsx';
import VehicleEnergyCostNote from '../../components/VehicleEnergyCostNote.jsx';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useVehicle } from '../../useVehicle';
import { calculateCosts, formatAmount } from '../../vehicleData';
import '../../styles/VehiclePages.css';

export default function VehicleSimulationPage() {
  const { id } = useParams();
  const navigationState = readScopedFinancialState(useLocation().state);
  const { vehicles, conditions: storedConditions, financialComparison, usingPresetConditions } = useVehicle();
  const vehicle = vehicles.find((v) => v.id === id);
  const { conditions, finance: initialFinance } = navigationState?.purchaseScenario ?? purchaseScenario(vehicle, storedConditions, usingPresetConditions ? null : financialComparison);
  const initialDownPayment = Math.min(conditions.downPayment, vehicle?.price ?? 0, conditions.cash);
  const [downPaymentInput, setDownPaymentInput] = useState(null);
  const downPayment = downPaymentInput === null ? initialDownPayment : (Number(downPaymentInput) || 0);
  const [financeInput, setFinance] = useState(initialFinance);
  const finance = {
    ...financeInput,
    rate: Number(financeInput.rate) || 0,
    distance: Number(financeInput.distance) || 0,
  };
  const [planned, setPlanned] = useState(false);
  if (!vehicle) return <div className="vehicle-page panel"><h1>차량을 찾을 수 없습니다.</h1><Link to="/vehicles">추천 차량 보기</Link></div>;
  const before = calculateCosts(vehicle, { ...conditions, downPayment: initialDownPayment }, initialFinance);
  const after = calculateCosts(vehicle, { ...conditions, downPayment }, finance);
  function reset() { setDownPaymentInput(null); setFinance(initialFinance); setPlanned(false); }
  function updateFinance(key, value) { if (key === 'months' && value === 0) setDownPaymentInput(vehicle.price); setFinance(current => ({ ...current, [key]: value })); setPlanned(false); }
  const risk = (costs) => costs.total <= conditions.limit ? '낮음' : costs.total <= conditions.limit * 1.4 ? '보통' : '높음';
  return <div className="vehicle-page"><div className="vehicle-heading split"><div><h1>구매조건 시뮬레이션</h1><p>목돈과 할부기간을 바꿔 월 부담과 위험도 변화를 확인하세요.</p></div><span className="vehicle-badge">{vehicle.name}</span></div><div className="vehicle-stat-grid">{[['차량가격', formatAmount(vehicle.price)], ['목돈', formatAmount(downPayment)], ['할부금리', `${finance.rate}%`], ['연간 주행거리', `${finance.distance.toLocaleString()}km`]].map(([label, value]) => <div className="panel" key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="vehicle-simulation-grid"><section className="panel"><h2>구매조건 변경</h2><p className="muted">변경값이 오른쪽 결과에 즉시 반영됩니다.</p><label className="vehicle-slider vehicle-cash-input">
      <span>목돈 (만 원)</span>
      <FinancialMoneyInput
        value={downPaymentInput ?? initialDownPayment}
        max={Math.min(vehicle.price, conditions.cash)}
        onValueChange={value => { setDownPaymentInput(value); if (finance.months === 0 && Number(value) < vehicle.price) setFinance(current => ({ ...current, months: 48 })); setPlanned(false); }}
      />
    </label><fieldset className="vehicle-choice"><legend>할부기간</legend>{[0, 48, 60, 72].map((months) => <button key={months} disabled={months === 0 && conditions.cash < vehicle.price} aria-pressed={finance.months === months} onClick={() => updateFinance('months', months)}>{months ? `${months}개월` : '일시불'}</button>)}</fieldset><label className="vehicle-slider vehicle-cash-input">
      <span>금리 (%)</span>
      <FinancialMoneyInput value={financeInput.rate} max={15} decimalPlaces={1} onValueChange={value => updateFinance('rate', value)} />
    </label>
    <label className="vehicle-slider vehicle-cash-input">
      <span>연간 주행거리 (km)</span>
      <FinancialMoneyInput value={financeInput.distance} max={40000} decimalPlaces={0} onValueChange={value => {
        if (!value.includes('.')) updateFinance('distance', value);
      }} />
    </label></section><section className="panel"><h2>변경 전후 결과</h2><p className="muted">목돈 {formatAmount(initialDownPayment)} → {formatAmount(downPayment)} 비교</p><table className="vehicle-table simulation-table"><thead><tr><th scope="col">구분</th><th scope="col">변경 전</th><th scope="col">변경 후</th></tr></thead><tbody>{[['월 할부금', 'installment'], ['총이자', 'interest'], ['월 자동차비', 'total'], ['남는 월 가용자금', 'remaining']].map(([label, key]) => <tr key={key}><th scope="row">{label}</th><td>{formatAmount(before[key])}</td><td>{formatAmount(after[key])}</td></tr>)}</tbody></table><div className="vehicle-chart"><h3>구매조건 변경 전후</h3><small>단위: 만 원 · 변경 전 / 변경 후</small><div className="vehicle-bars">{[['월비용', before.total, after.total], ['가용자금', before.remaining, after.remaining]].map(([label, a, b]) => <div key={label}><div className="bar-pair"><span style={{ height: `${Math.max(2, Math.max(0, a) / Math.max(before.total, after.total, before.remaining, after.remaining, 1) * 140)}px` }} title={`변경 전 ${formatAmount(a)}`} /><span style={{ height: `${Math.max(2, Math.max(0, b) / Math.max(before.total, after.total, before.remaining, after.remaining, 1) * 140)}px` }} title={`변경 후 ${formatAmount(b)}`} /></div><small>{label}</small></div>)}</div></div><div className="vehicle-risk"><div className="vehicle-note warning"><small>변경 전 위험도</small><strong>{risk(before)}</strong></div><div className="vehicle-note mint"><small>변경 후 위험도</small><strong>{risk(after)}</strong></div></div></section></div><div className="vehicle-actions"><button className="vehicle-button" onClick={reset}>초기 조건으로</button><button className="vehicle-button primary" onClick={() => setPlanned(true)}>이 조건으로 구매 계획</button></div>{planned && <div className="vehicle-note mint" role="status"><strong>구매 계획 요약</strong><p>{vehicle.name} · 목돈 {formatAmount(downPayment)} · {finance.months}개월 · 금리 {finance.rate}% · 예상 월 비용 {formatAmount(after.total)}</p><p>현재 화면에서 확인하는 예시 계획입니다. 실제 구매 신청은 진행되지 않습니다.</p><Link to={`/vehicles/${id}`} state={scopeFinancialState({ purchaseScenario: { conditions: { ...conditions, downPayment }, finance } })}>차량 상세로 돌아가기</Link></div>}<p className="vehicle-disclaimer">실제 대출 심사와 보험 견적을 반영하지 않은 예시 계산입니다. 위험도는 입력한 월 차량비 한도 기준입니다.</p><VehicleEnergyCostNote /></div>;
}
