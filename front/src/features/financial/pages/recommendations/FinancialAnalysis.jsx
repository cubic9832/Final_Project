import { Wallet, ArrowRight, Car } from 'lucide-react';
import { useState } from 'react';
import theme from '../../../../styles/theme.js';
import { candidateMoney } from './candidatePresentation.js';
import './FinancialAnalysis.css';

export default function FinancialAnalysis({ totals, result, compact = false }) {
  const [activePanel, setActivePanel] = useState('monthly');
  const first = result.recommendations[0];
  const financial = first?.decisionEvidence?.financial;
  const budget = result.budgetPolicy;
  const financed = budget?.policy === 'income-ratio-financing-band-v1' && budget.financingMonths > 0;
  const money = value => candidateMoney(value * 10000);
  const spending = [
    { label: '생활비', value: totals.expenses - totals.loanPayment, tone: 'living' },
    { label: '대출 상환', value: totals.loanPayment, tone: 'debt' },
    { label: '월 유지비로 쓸 수 있는 돈', value: Math.max(0, totals.available), tone: 'available' },
  ];
  const total = spending.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  return <section className={`financial-analysis${compact ? ' analysis-compact' : ''}`} aria-label="내 차량 예산 분석">
    {compact && <div className="analysis-tabs" role="tablist" aria-label="재무 진단 항목"><button type="button" role="tab" id="analysis-monthly-tab" aria-selected={activePanel === 'monthly'} aria-controls="analysis-monthly-panel" onClick={() => setActivePanel('monthly')}>월 예산</button>{financial && <button type="button" role="tab" id="analysis-purchase-tab" aria-selected={activePanel === 'purchase'} aria-controls="analysis-purchase-panel" onClick={() => setActivePanel('purchase')}>구매 후 자금</button>}</div>}
    <article className="analysis-budget-card">
      <span className="analysis-icon"><Wallet size={theme.iconSize.lg} aria-hidden /></span>
      <p className="analysis-label">내 차량 구매 예산</p>
      <h2>{budget ? <>{candidateMoney(budget.financialUpper)}<small>까지</small></> : '예산 정보를 확인해 주세요'}</h2>
      <p>{financed ? `목돈 ${candidateMoney(budget.availablePurchaseFunds)}에 월 ${candidateMoney(budget.monthlyVehicleCap)} 한도로 ${budget.financingMonths}개월 할부를 더한 기준이에요.` : '차량 구매·유지에 쓰기로 한 목돈 기준이에요.'}</p>
      {['cash-importance-band-v1', 'income-ratio-financing-band-v1'].includes(budget?.policy) && <div className="analysis-price-band"><span>선택한 가성비로 찾을 가격대</span><strong>{candidateMoney(budget.lower)} ~ {candidateMoney(budget.upper)}</strong></div>}
    </article>
    <article className="analysis-panel" id={compact ? 'analysis-monthly-panel' : undefined} role={compact ? 'tabpanel' : undefined} aria-labelledby={compact ? 'analysis-monthly-tab' : undefined} hidden={compact && activePanel !== 'monthly'}>
      <div className="analysis-card-title"><h2>매달 이만큼 쓸 수 있어요</h2><span>월 기준</span></div>
      <strong className="analysis-monthly-amount">{money(totals.available)}</strong>
      <p>월소득에서 생활비와 대출 상환액을 뺀 금액이에요.</p>
      <div className="analysis-stacked-bar" aria-hidden="true">{spending.map(item => <span key={item.tone} className={`analysis-tone-${item.tone}`} style={{ width: `${total ? Math.max(0,item.value)/total*100 : 0}%` }} />)}</div>
      <dl className="analysis-legend"><div className="analysis-income"><dt>월 총수령액</dt><dd>{money(totals.income)}</dd></div>{spending.map(item => <div key={item.tone}><dt><i className={`analysis-tone-${item.tone}`} aria-hidden />{item.label}</dt><dd>{money(item.value)}</dd></div>)}</dl>
      {totals.available < 0 && <p className="analysis-inline-notice">매달 지출이 소득보다 {money(-totals.available)} 많아요.</p>}
    </article>
    {financial && <article className="analysis-panel" id={compact ? 'analysis-purchase-panel' : undefined} role={compact ? 'tabpanel' : undefined} aria-labelledby={compact ? 'analysis-purchase-tab' : undefined} hidden={compact && activePanel !== 'purchase'}>
      <div className="analysis-card-title"><h2>차를 사면 얼마나 남을까요?</h2><Car size={theme.iconSize.md} aria-hidden /></div>
      <p className="analysis-vehicle-label">첫 추천 차량 · {first.vehicle.brand} {first.vehicle.model}</p>
      <p>{first.vehicle.trim} 구매 기준이에요. 다른 차량은 다음 화면에서 비교할 수 있어요.</p>
      <div className="analysis-cash-change"><div><span>구매 전 목돈</span><strong>{candidateMoney(financial.purchaseFunds)}</strong></div><ArrowRight size={theme.iconSize.md} aria-hidden /><div><span>구매 후 남는 목돈</span><strong>{candidateMoney(financial.cashAfterPurchase)}</strong></div></div>
      <dl className="analysis-legend">
        <div><dt>차량 가격</dt><dd>{candidateMoney(financial.purchaseCost)}</dd></div>
        <div><dt>예상 월 유지비</dt><dd>{candidateMoney(financial.monthlyRunningCost)}</dd></div>
        <div><dt>유지비를 쓴 뒤 월 잔여금</dt><dd>{candidateMoney(financial.remainingMonthly)}</dd></div>
      </dl>
      {financial.fundingSource === 'assets' && <p className="analysis-inline-notice">남은 목돈에서 매달 {candidateMoney(financial.monthlyAssetDrawdown)}을 사용해요. 수입과 지출이 같다면 약 {financial.assetRunwayMonths}개월 유지할 수 있어요.</p>}
    </article>}
  </section>;
}
