import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { calculatePurchasePlan } from '../../purchasePlan.js';
import { getVehicleCostDefaults } from '../../vehicleCostDefaults.js';
import theme from '../../../../styles/theme.js';
import PlanField from './PlanField.jsx';
import './PurchaseCostDialog.css';
import useUnsavedChanges from '../../../../shared/navigation/useUnsavedChanges.js';

const money = value => `${Math.round(value).toLocaleString('ko-KR')}만 원`;

export default function PurchaseCostDialog({ vehicle, inputs, onClose, onSave }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [draft, setDraft] = useState(() => ({ ...inputs }));
  const [error, setError] = useState('');
  const defaults = getVehicleCostDefaults(vehicle, draft.annualDistance);
  const calculationInputs = { ...draft, ...defaults.inputs };
  const result = calculatePurchasePlan(vehicle.price / 10000, { ...calculationInputs, savings: 0, monthlySaving: 0, targetMonths: 1, reserveMonths: Number.isFinite(draft.reserveMonths) ? Math.max(0, draft.reserveMonths) : 0 });
  const valid = ['annualDistance', 'efficiency', 'energyPrice', 'insurance', 'annualTax', 'maintenance', 'parking', 'registrationRate', 'extras'].every(key => Number.isFinite(calculationInputs[key]) && calculationInputs[key] >= 0 && calculationInputs[key] <= 100000000) && calculationInputs.efficiency >= .1;
  const dirty = JSON.stringify(draft) !== JSON.stringify(inputs);
  const guard = useUnsavedChanges(dirty, { inline: true });
  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; trigger?.focus(); };
  }, []);
  const close = () => guard.requestLeave(onClose);
  function save() {
    if (!valid) {
      guard.cancelLeave();
      setError('입력값을 확인해 주세요. 유효한 숫자를 입력하면 계산 기준을 적용할 수 있어요.');
      return;
    }
    try {
      onSave(calculationInputs);
      if (guard.confirming) guard.confirmLeave();
    } catch (failure) {
      guard.cancelLeave();
      setError(failure.message || '계산 기준을 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  }
  const change = (name, value) => { setDraft(current => ({ ...current, [name]: value })); setError(''); };
  const field = (name, label, unit, min) => <PlanField key={name} {...{ name, label, unit, min }} inputs={calculationInputs} readOnly={Object.hasOwn(defaults.inputs, name)} onChange={change} />;
  return createPortal(<dialog ref={dialog} className="purchase-cost-dialog" aria-labelledby={titleId}
    onCancel={event => event.preventDefault()}>
    <header><h2 id={titleId}>구매·유지비 계산 기준</h2><button type="button" aria-label="닫기" onClick={close}><X size={theme.iconSize.md} aria-hidden /></button></header>
    {guard.confirming ? <div className="purchase-cost-content">
      <p>저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?</p>
      <div className="purchase-cost-actions">
        <button type="button" className="dream-reset" onClick={guard.confirmLeave}>저장하지 않고 닫기</button>
        <button type="button" className="dream-save" onClick={save}>저장</button>
      </div>
    </div> : <form onSubmit={event => { event.preventDefault(); event.stopPropagation(); save(); }}>
      <div className="purchase-cost-content">
        <div className="purchase-cost-preview" role="status" aria-live="polite"><span>구매 후 예상 월 유지비</span><strong>{valid ? money(result.monthlyTotal) : '입력값 확인 필요'}</strong><small>{valid ? `유지비 예비자금 ${money(result.reserve)}` : '필수 계산값을 입력해 주세요.'}</small></div>
        <p className="dream-note">자동 계산값은 예산 수립용 예상치입니다. 실제 견적·납부 금액과 다를 수 있어요.</p>
        <div className="dream-fields">
          {field('annualDistance', '연간 주행거리', 'km')}
          {field('efficiency', (vehicle.fuel === 'ELECTRIC' ? '전비' : '연비') + (defaults.efficiencyEstimated ? ' (추정)' : ''), vehicle.fuel === 'ELECTRIC' ? 'km/kWh' : vehicle.fuel === 'HYDROGEN' ? 'km/kg' : 'km/L', .1)}
          {field('energyPrice', vehicle.fuel === 'ELECTRIC' ? '충전 단가' : '연료 단가', vehicle.fuel === 'ELECTRIC' ? '원/kWh' : vehicle.fuel === 'HYDROGEN' ? '원/kg' : '원/L')}
          {field('insurance', '연간 보험료', '만 원')}{field('annualTax', '연간 자동차세', '만 원')}{field('maintenance', '연간 정비·소모품', '만 원')}
          {field('parking', '월 주차·기타 비용', '만 원')}{field('extras', '옵션·기타 초기비용', '만 원')}
        </div>
        <p className="dream-note">회색 항목은 차량 기준값으로 자동 계산됩니다.</p>
        <Link className="dream-note" to={`/dream-car/calculation-guide?vehicle=${encodeURIComponent(vehicle.id)}&distance=${encodeURIComponent(draft.annualDistance)}`} target="_blank" rel="noreferrer">계산 기준 자세히 보기 (새 탭)</Link>
        {error && <p className="dream-cost-error" role="alert">{error}</p>}
      </div>
      <footer><button type="submit" className="dream-save">계산 기준 적용</button></footer>
    </form>}
  </dialog>, document.body);
}
