import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Car, Wallet, ClipboardCheck, SlidersHorizontal } from 'lucide-react';
import { useVehicle } from '../../../vehicle/useVehicle';
import VehicleCatalogGate from '../../../vehicle/components/VehicleCatalogGate.jsx';
import DreamCarPreview from '../../components/DreamCarPreview';
import { calculatePurchasePlan, defaultPlan } from '../../purchasePlan';
import { getVehicleCostDefaults, updatePlanInput } from '../../vehicleCostDefaults';
import theme from '../../../../styles/theme';
import './DreamCarPlannerPage.css';
import DreamCarPageHeader from '../../components/DreamCarPageHeader';
import PurchaseFundingSummary from '../../components/PurchaseFundingSummary';
import PlanField from './PlanField.jsx';
import PurchaseCostDialog from './PurchaseCostDialog.jsx';
import { purchasePlanUpdatedEvent, savePurchasePlanWithProgress } from '../../purchasePlanSync';
import { currentDate } from '../../savingsProgress';

const money = value => `${Math.round(value).toLocaleString('ko-KR')}만 원`;
const fuels = { GASOLINE: '가솔린', HYBRID: '하이브리드', ELECTRIC: '전기', DIESEL: '디젤', LPG: 'LPG', HYDROGEN: '수소' };
const storageKey = 'dream-car-plan-v3';
function readPlan(catalog) {
  try {
    const current = localStorage.getItem(storageKey);
    const saved = JSON.parse(current || localStorage.getItem('dream-car-plan-v2'));
    if (!current && saved?.inputs) {
      const vehicle = catalog.find(car => car.id === saved.vehicleId);
      if (vehicle) Object.assign(saved.inputs, getVehicleCostDefaults(vehicle, saved.inputs.annualDistance).inputs);
    }
    const savedVehicle = catalog.find(car => car.id === saved?.vehicleId);
    if (savedVehicle && saved.inputs && (!Number.isFinite(saved.inputs.efficiency) || saved.inputs.efficiency <= 0)) saved.inputs.efficiency = getVehicleCostDefaults(savedVehicle).inputs.efficiency;
    if (saved && catalog.some(car => car.id === saved.vehicleId) && Object.keys(defaultPlan).every(key => Number.isFinite(saved.inputs?.[key]) && saved.inputs[key] >= 0)) return saved;
  } catch { /* 저장된 계획이 없으면 기본 조건으로 시작한다. */ }
  return { vehicleId: catalog[0].id, inputs: { ...defaultPlan, ...getVehicleCostDefaults(catalog[0]).inputs } };
}
export default function DreamCarPlannerPage() {
  const { planningVehicles } = useVehicle();
  return <VehicleCatalogGate>{planningVehicles.length ? <DreamCarPlannerPageContent catalog={planningVehicles} /> : <p role="status">차량 카탈로그가 비어 있습니다.</p>}</VehicleCatalogGate>;
}

function DreamCarPlannerPageContent({ catalog }) {
  const navigate = useNavigate();
  const heading = useRef(null);
  const { state: navigationState } = useLocation();
  const [currentStep, setStep] = useState(() => navigationState?.returnToSummary ? 2 : 0);
  const step = Math.min(currentStep, 2);
  const initialStep = useRef(step);
  const [hasChangedStep, setHasChangedStep] = useState(false);
  useEffect(() => { if (step !== initialStep.current) setHasChangedStep(true); }, [step]);
  const [costsOpen, setCostsOpen] = useState(false);
  const steps = ['나의 드림카', '자금·저축 계획', '종합 계획'];
  useEffect(() => { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);
  const models = [...new Set(catalog.map(car => `${car.brand} ${car.model}`))];
  const [plan, setPlan] = useState(() => readPlan(catalog));
  useEffect(() => {
    function sync(event) { if (!event.key || event.key === storageKey) setPlan(readPlan(catalog)); }
    window.addEventListener('storage', sync);
    window.addEventListener(purchasePlanUpdatedEvent, sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener(purchasePlanUpdatedEvent, sync); };
  }, [catalog]);
  const [startedAt] = useState(() => Date.now());
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const { vehicleId, inputs } = plan;
  const vehicle = catalog.find(car => car.id === vehicleId) || catalog[0];
  const selectedModel = `${vehicle.brand} ${vehicle.model}`;
  const filteredModels = models.filter(model => model.toLowerCase().includes(query.trim().toLowerCase()));
  const trims = catalog.filter(car => `${car.brand} ${car.model}` === selectedModel);
  const result = calculatePurchasePlan(vehicle.price / 10000, inputs);
  const valid = result && Object.values(inputs).every(value => value !== '' && value <= 100000000) && inputs.targetMonths >= 1 && inputs.efficiency >= 0.1;
  function change(name, value) { setPlan(current => ({ ...current, inputs: updatePlanInput(vehicle, current.inputs, name, value) })); setNotice(''); }
  function selectVehicle(id) {
    const next = catalog.find(car => car.id === id);
    setPlan(current => ({ vehicleId: id, inputs: { ...current.inputs, ...getVehicleCostDefaults(next, current.inputs.annualDistance).inputs } }));
    setNotice('');
  }
  function save() {
    try {
      savePurchasePlanWithProgress(plan, result.target, currentDate(), vehicle);
      return true;
    } catch (error) { setNotice(error.message || '브라우저 저장 공간을 사용할 수 없습니다.'); return false; }
  }
  function field(name, label, unit, min) {
    return <PlanField key={name} {...{ name, label, unit, min, inputs }} onChange={change} />;
  }
  const descriptions = ['갖고 싶은 모델과 트림을 골라 주세요.', '준비한 자금과 매월 모을 금액, 목표 기간을 정해 주세요.', '입력한 조건과 예상 비용을 확인하고 구매 계획을 저장하세요.'];
  const icons = [Car, Wallet, ClipboardCheck];
  const StepIcon = icons[step];
  const stepValid = step === 0 || (step === 1
    ? ['savings', 'reserveMonths', 'monthlySaving'].every(key => Number.isFinite(inputs[key]) && inputs[key] >= 0 && inputs[key] <= 100000000)
      && Number.isInteger(inputs.targetMonths) && inputs.targetMonths >= 1 && inputs.targetMonths <= 100000000
    : valid);
  return <div className="dream-page dream-planner-flow">
    <DreamCarPageHeader title="드림카, 꿈에서 내 차로." description="갖고 싶은 차를 고르면, 준비해야 할 돈과 시간이 보입니다." />
    <div className="dream-primary-grid">
      <section key={step} className={`dream-card dream-flow-input${hasChangedStep ? ' is-step-transition' : ''}`} aria-labelledby="dream-step-title">
        <div className="dream-section-title"><span>0{step + 1}</span><h2 id="dream-step-title" ref={heading} tabIndex={-1}>{steps[step]}</h2><StepIcon size={theme.iconSize.lg} aria-hidden /></div>
        <p className="dream-flow-description">{descriptions[step]}</p>
        {step === 0 && <>
        <label className="dream-field"><span>모델 검색</span><input type="search" placeholder="브랜드 또는 모델명으로 검색" value={query} onChange={event => setQuery(event.target.value)} /></label>
        {filteredModels.length ? <label className="dream-field"><span>모델 선택 · 검색 결과 {filteredModels.length}개</span><select value={filteredModels.includes(selectedModel) ? selectedModel : ''} onChange={event => selectVehicle(catalog.find(car => `${car.brand} ${car.model}` === event.target.value).id)}><option value="" disabled>모델을 선택해 주세요</option>{filteredModels.map(model => <option key={model}>{model}</option>)}</select></label> : <p role="status">검색 결과가 없습니다. 다른 모델명을 입력해 주세요.</p>}
        <label className="dream-field"><span>트림 선택</span><select value={vehicleId} onChange={event => selectVehicle(event.target.value)}>{trims.map(car => <option key={car.id} value={car.id}>{car.trim} · {fuels[car.fuel] || car.fuel} · {money(car.price / 10000)}</option>)}</select></label>
        <DreamCarPreview vehicle={vehicle} />
        </>}
        {step === 1 && <div className="dream-flow-fields">{field('savings', '차 구매용으로 모은 돈', '만 원')}{field('reserveMonths', '구매 후 유지비 예비자금', '개월')}{field('monthlySaving', '매월 저축할 금액', '만 원')}{field('targetMonths', '목표까지 남은 기간', '개월', 1)}</div>}
        {step === 2 && <><dl className="dream-flow-review">{[
          ['차 구매용으로 모은 돈', money(inputs.savings), 1],
          ['유지비 예비자금', `${inputs.reserveMonths}개월`, 1],
          ['매월 저축할 금액', money(inputs.monthlySaving), 1],
          ['목표 기간', `${inputs.targetMonths}개월`, 1],
        ].map(([label, value, target]) => <div key={label}><dt>{label}</dt><dd>{value}</dd><button type="button" onClick={() => setStep(target)} aria-label={`${label} 수정`}>수정</button></div>)}</dl><DreamCarPreview vehicle={vehicle} /></>}
        <button type="button" className="dream-cost-trigger" onClick={() => setCostsOpen(true)}><SlidersHorizontal size={theme.iconSize.sm} aria-hidden />구매·유지비 계산 기준 수정</button>
      </section>
      <aside className="dream-flow-summary" aria-label="실시간 구매 계획 요약" aria-live="polite" aria-atomic="true">
        {valid ? <><PurchaseFundingSummary result={result} inputs={inputs} baseDate={startedAt} /><div className="dream-flow-costs"><span>구매 후 예상 월 유지비</span><strong>{money(result.monthlyTotal)}</strong><small>취득·등록 비용 {money(result.registration)} · 예비자금 {money(result.reserve)}</small></div></> : <section className="dream-card" role="status"><h2>입력값을 확인해 주세요</h2><p>유효한 금액을 입력하면 예상 자금과 구매 시기를 계산해요.</p></section>}
      </aside>
    </div>
    <div className={`dream-flow-actions${step === 2 ? ' is-final' : ''}`}>
      <button type="button" className="dream-reset" disabled={step === 0} onClick={() => { setNotice(''); setStep(step - 1); }}>이전</button>
      {step < 2 ? <button type="button" className="dream-save" disabled={!stepValid} onClick={() => { setNotice(''); setStep(step + 1); }}>다음</button> : <button type="button" className="dream-save" disabled={!valid} onClick={() => { if (save()) navigate('/dream-car/progress'); }}>구매 계획 저장</button>}
    </div>
    {notice && <p className="dream-flow-notice" role="status">{notice}</p>}
    {costsOpen && <PurchaseCostDialog vehicle={vehicle} inputs={inputs} onClose={() => setCostsOpen(false)} onSave={next => { setPlan(current => ({ ...current, inputs: next })); setNotice('계산 기준을 적용했습니다.'); setCostsOpen(false); }} />}
  </div>;
}
