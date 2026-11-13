import { useState } from 'react';
import { Repeat } from 'lucide-react';
import { saveRecurringRule, toggleRecurringRule } from '../../recurringSavings';
import SavingDatePicker from './SavingDatePicker';
import theme from '../../../../styles/theme';

export default function RecurringSavingsSettings({ plan, asOfDate, onSave }) {
  const currentRule = plan.recurringRules?.at(-1);
  const [date, setDate] = useState((plan.startDate || `${plan.startMonth}-01`) > asOfDate ? (plan.startDate || `${plan.startMonth}-01`) : asOfDate);
  const [unit, setUnit] = useState('month');
  const [interval, setIntervalValue] = useState('1');
  const [amount, setAmount] = useState(String(plan.monthlySaving || ''));
  const [memo, setMemo] = useState('자동이체 저축');
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || !/^\d+$/.test(interval)) { setError('금액은 소수점 둘째 자리까지, 간격은 정수로 입력해 주세요.'); return; }
    try {
      const rule = { id: crypto.randomUUID(), startDate: date, unit, interval: Number(interval), amount: Number(amount), memo, enabled: true };
      if (onSave(saveRecurringRule(plan, rule, asOfDate), currentRule ? '정기 기록 설정을 변경하고 오늘 예정된 기록을 반영했습니다.' : '정기 기록 설정을 저장하고 오늘까지의 예정일을 반영했습니다.')) setError('');
    } catch (failure) { setError(failure.message); }
  }
  function toggle(id) {
    try { onSave(toggleRecurringRule(plan, id, asOfDate), '정기 기록 상태를 변경했습니다. 기존 저축 기록은 유지합니다.'); } catch (failure) { setError(failure.message); }
  }
  return <section className="savings-card savings-recurring"><div className="savings-section-heading"><Repeat size={theme.iconSize.md} aria-hidden /><h2>정기 저축 자동 기록</h2></div>

    <details className="savings-recurring-add"><summary>{currentRule ? '정기 기록 설정 변경' : '정기 기록 설정 추가'}</summary><form onSubmit={submit}>
      <SavingDatePicker label="첫 기록 날짜" value={date} min={plan.startDate || `${plan.startMonth}-01`} max="2100-12-31" today={asOfDate} onChange={setDate} />
      <div className="savings-recurring-frequency"><label>반복 간격<input type="text" inputMode="numeric" value={interval} required onChange={event => setIntervalValue(event.target.value)} /></label><label>단위<select value={unit} onChange={event => setUnit(event.target.value)}><option value="day">일마다</option><option value="week">주마다</option><option value="month">개월마다</option></select></label></div>
      <label>고정 저축액<div className="savings-amount-input"><input type="text" inputMode="decimal" value={amount} required onChange={event => setAmount(event.target.value)} /><span>만 원</span></div></label>
      <label>고정 메모<input value={memo} maxLength={200} onChange={event => setMemo(event.target.value)} /></label>
      {error && <p className="savings-error" role="alert">{error}</p>}<button className="savings-button navy" type="submit">자동 기록 설정 저장</button>
      {currentRule && <button type="button" className="savings-edit-record savings-recurring-toggle" onClick={() => toggle(currentRule.id)}>{currentRule.enabled ? '자동 기록 일시중지' : '자동 기록 다시 시작'}</button>}
    </form></details>
  </section>;
}
