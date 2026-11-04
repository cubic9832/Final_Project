import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { calculatePurchasePlan } from '../../purchasePlan.js';
import { getVehicleCostDefaults, updatePlanInput } from '../../vehicleCostDefaults.js';
import theme from '../../../../styles/theme.js';
import PlanField from './PlanField.jsx';
import './PurchaseCostDialog.css';

const money = value => `${Math.round(value).toLocaleString('ko-KR')}만 원`;

export default function PurchaseCostDialog({ vehicle, inputs, onClose, onSave }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [draft, setDraft] = useState(() => ({ ...inputs }));
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState('');
  const result = calculatePurchasePlan(vehicle.price / 10000, { ...draft, savings: 0, monthlySaving: 0, targetMonths: 1, reserveMonths: Number.isFinite(draft.reserveMonths) ? Math.max(0, draft.reserveMonths) : 0 });
  const valid = ['annualDistance', 'efficiency', 'energyPrice', 'insurance', 'annualTax', 'maintenance', 'parking', 'registrationRate', 'extras'].every(key => Number.isFinite(draft[key]) && draft[key] >= 0 && draft[key] <= 100000000) && draft.efficiency >= .1;
  const defaults = getVehicleCostDefaults(vehicle, draft.annualDistance);
  const dirty = JSON.stringify(draft) !== JSON.stringify(inputs);
  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; trigger?.focus(); };
  }, []);
  const close = () => dirty ? setDiscarding(true) : onClose();
  const change = (name, value) => { setDraft(current => updatePlanInput(vehicle, current, name, value)); setError(''); };
  const field = (name, label, unit, min) => <PlanField key={name} {...{ name, label, unit, min }} inputs={draft} onChange={change} />;
  return createPortal(<dialog ref={dialog} className="purchase-cost-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => {
      if (event.target !== dialog.current) return;
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
    <header><h2 id={titleId}>구매·유지비 계산 기준</h2><button type="button" aria-label="닫기" onClick={close}><X size={theme.iconSize.md} aria-hidden /></button></header>
    {discarding ? <div className="purchase-cost-content"><p>저장하지 않은 변경을 버릴까요?</p><div className="purchase-cost-actions"><button type="button" className="dream-reset" onClick={() => setDiscarding(false)}>계속 입력</button><button type="button" className="dream-save" onClick={onClose}>변경 버리기</button></div></div> : <form onSubmit={event => { event.preventDefault(); event.stopPropagation(); if (valid) onSave(draft); else setError('입력값을 확인해 주세요. 유효한 숫자를 입력하면 계산 기준을 적용할 수 있어요.'); }}>
      <div className="purchase-cost-content">
        <div className="purchase-cost-preview" role="status" aria-live="polite"><span>구매 후 예상 월 유지비</span><strong>{valid ? money(result.monthlyTotal) : '입력값 확인 필요'}</strong><small>{valid ? `유지비 예비자금 ${money(result.reserve)}` : '필수 계산값을 입력해 주세요.'}</small></div>
        <p className="dream-note">자동 계산값은 예산 수립용 예상치입니다. 실제 견적·납부 금액과 다를 수 있어요.</p>
        <div className="dream-fields">
          {field('annualDistance', '연간 주행거리', 'km')}
          {field('efficiency', (vehicle.fuel === 'ELECTRIC' ? '전비' : '연비') + (defaults.efficiencyEstimated ? ' (추정)' : ''), vehicle.fuel === 'ELECTRIC' ? 'km/kWh' : vehicle.fuel === 'HYDROGEN' ? 'km/kg' : 'km/L', .1)}
          {field('energyPrice', vehicle.fuel === 'ELECTRIC' ? '충전 단가' : '연료 단가', vehicle.fuel === 'ELECTRIC' ? '원/kWh' : vehicle.fuel === 'HYDROGEN' ? '원/kg' : '원/L')}
          {field('insurance', '연간 보험료', '만 원')}{field('annualTax', '연간 자동차세', '만 원')}{field('maintenance', '연간 정비·소모품', '만 원')}
          {field('parking', '월 주차·기타 비용', '만 원')}{field('registrationRate', '취득·등록 비용 가정', '%')}{field('extras', '옵션·기타 초기비용', '만 원')}
        </div>
        <button type="button" className="dream-reset purchase-cost-defaults" onClick={() => { setDraft(current => ({ ...current, ...defaults.inputs })); setError(''); }}>차량 기준값 다시 적용</button>
        <Link className="dream-note" to={`/dream-car/calculation-guide?vehicle=${encodeURIComponent(vehicle.id)}&distance=${encodeURIComponent(draft.annualDistance)}`} target="_blank" rel="noreferrer">계산 기준 자세히 보기 (새 탭)</Link>
        {error && <p className="dream-cost-error" role="alert">{error}</p>}
      </div>
      <footer><button type="submit" className="dream-save">계산 기준 적용</button></footer>
    </form>}
  </dialog>, document.body);
}
