import { useState } from 'react';
import FinancialMoneyInput from './FinancialMoneyInput.jsx';
import { calculateFinancialSummary } from '../calculateFinancialSummary.js';

export default function FinancialBudgetEditor({ kind, diagnosis, onSave, onCancel }) {
  const totals = calculateFinancialSummary(diagnosis.values, diagnosis.loans);
  const deposit = kind === 'deposit';
  const [draft, setDraft] = useState(() => String(deposit ? diagnosis.assets?.deposit ?? '' : totals.available));
  const amount = Number(draft);
  const income = Math.round((amount + totals.expenses) * 100) / 100;
  const valid = draft.trim() !== '' && Number.isFinite(amount) && (deposit ? amount >= 0 : income >= 0 && income <= 9999999999.99);
  function save() {
    if (!valid) return;
    onSave(deposit
      ? { assets: { ...diagnosis.assets, deposit: draft } }
      : { values: { ...diagnosis.values, income: String(income), extraIncome: '0' } });
  }
  return <div className="financial-budget-editor" onKeyDown={event => {
    if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); save(); }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); }
  }}>
    <div className="financial-input-wrap"><FinancialMoneyInput autoFocus aria-label={deposit ? '차량 구매·유지용 목돈' : '월 유지비에 쓸 수 있는 금액'} value={draft} allowNegative={!deposit} onValueChange={setDraft} aria-invalid={!valid} /><span>만 원</span></div>
    {!deposit && <p>생활비·상환액은 유지하고 월 총수령액을 조정합니다.</p>}
    {!valid && <p role="status">{deposit ? '0 이상의 금액을 입력해 주세요.' : '월 총수령액이 0 이상이 되는 금액을 입력해 주세요.'}</p>}
    <div className="financial-budget-editor-actions"><button type="button" onClick={onCancel}>취소</button><button type="button" disabled={!valid} onClick={save}>적용</button></div>
  </div>;
}
