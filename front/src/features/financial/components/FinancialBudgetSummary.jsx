import { useState } from 'react';
import FinancialBudgetEditor from './FinancialBudgetEditor.jsx';
import { calculateFinancialSummary } from '../calculateFinancialSummary.js';
import { formatFinancialMoney } from '../formatFinancialMoney.js';

const money = value => formatFinancialMoney(Number(value) * 10000);

export default function FinancialBudgetSummary({ values = {}, assets, loans = [], editingDisabled = false, onBudgetChange, diagnosis }) {
  const [editing, setEditing] = useState(null);
  const totals = calculateFinancialSummary(values, loans);
  const hasIncome = values.income !== undefined && values.income !== '';
  const hasAssets = assets?.deposit !== undefined && assets.deposit !== '';
  const monthly = totals.available;
  const editor = kind => <FinancialBudgetEditor key={kind} kind={kind} diagnosis={diagnosis} onCancel={() => setEditing(null)} onSave={changes => { onBudgetChange(changes); setEditing(null); }} />;
  return <aside className="financial-budget-summary" aria-labelledby="budget-summary-title">
    <span className="financial-eyebrow">MY BUDGET</span>
    <h2 id="budget-summary-title">내 차량 예산</h2>
    <p>입력한 금액이 바로 반영됩니다.</p>
    <dl aria-live="polite" aria-atomic="true">
      <div className="financial-budget-purchase"><dt><span className="survey-summary-label">사용 가능한 목돈의 액수</span>{onBudgetChange && <button type="button" className="survey-summary-edit" disabled={editingDisabled || editing !== null} aria-label="사용 가능한 목돈의 액수 수정" onClick={() => setEditing('deposit')}>수정</button>}</dt><dd>{editing === 'deposit' ? editor('deposit') : hasAssets ? money(Math.max(0, Number(assets.deposit))) : '—'}</dd><small>{hasAssets ? '차량값과 구매 후 부족한 월 자금에 함께 사용할 총액' : '목돈을 입력하면 계산해 드려요'}</small></div>
      <div><dt><span className="survey-summary-label">월 유지비에 쓸 수 있는 금액</span>{onBudgetChange && <button type="button" className="survey-summary-edit" disabled={editingDisabled || editing !== null} aria-label="월 유지비 가용액의 수입·지출 수정" onClick={() => setEditing('monthlyBudget')}>수정</button>}</dt><dd>{editing === 'monthlyBudget' ? editor('monthlyBudget') : hasIncome ? money(monthly) : '—'}</dd><small>생활비·상환 차감 후</small></div>
    </dl>
    {hasIncome && monthly <= 0 && <p className="financial-budget-warning">월 유지비 여력이 부족합니다. 지출과 구매 후 남는 목돈을 확인해 주세요.</p>}
    <p className="financial-budget-footnote">이 목돈에서 차량값을 먼저 지불합니다. 월소득으로 부족한 생활비·유지비는 남은 목돈으로 충당하며, 같은 돈을 두 번 계산하지 않습니다.</p>
  </aside>;
}
