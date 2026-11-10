import { CheckCircle2, Circle } from 'lucide-react';
import theme from '../../../styles/theme.js';

// 역할 배정과 화면 권한에서 동일한 직접 선택 방식과 선택 표시를 사용한다.
export default function PermissionSelection({ label, description, items, values, onChange, disabled }) {
  return <fieldset className="permission-selection">
    <legend><span>{label}</span><span className="permission-selection-count">{values.length}개 선택</span></legend>
    <p className="permission-help">{description || '항목을 누르면 선택하거나 해제할 수 있습니다.'}</p>
    <div className="permission-choice-grid">{items.map(item => {
      const selected = values.includes(item.value);
      const Icon = selected ? CheckCircle2 : Circle;
      return <button key={item.value} type="button" className="permission-choice" aria-pressed={selected}
        aria-label={`${item.label} ${selected ? '선택 해제' : '선택'}`} disabled={disabled}
        onClick={() => onChange(selected ? values.filter(value => value !== item.value) : [...values, item.value])}>
        <span className="permission-choice-heading"><strong>{item.label}</strong><span className="permission-choice-state"><Icon size={theme.iconSize.sm} aria-hidden="true" />{selected ? '선택됨' : '선택'}</span></span>
        {item.description && <span className="permission-choice-description">{item.description}</span>}
      </button>;
    })}</div>
    {items.length === 0 && <p className="permission-help">선택할 수 있는 항목이 없습니다.</p>}
  </fieldset>;
}
