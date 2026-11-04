import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import AuthModal from '../../auth/components/AuthModal.jsx';
import theme from '../../../styles/theme.js';
import FinancialBudgetSummary from './FinancialBudgetSummary.jsx';
import { calculateFinancialSummary } from '../calculateFinancialSummary.js';
import { formatFinancialMoney } from '../formatFinancialMoney.js';

export default function SurveySummary({ diagnosis, items = [], mode = 'budget', onEdit, editingDisabled = false }) {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches);
  const [expanded, setExpanded] = useState(false);
  const [conditionsExpanded, setConditionsExpanded] = useState(false);
  const summaryRef = useRef(null);
  useLayoutEffect(() => {
    const summary = summaryRef.current;
    const updateHeight = () => {
      const top = Math.max(16, summary.getBoundingClientRect().top);
      summary.style.setProperty('--survey-summary-max-height', `${Math.max(0, window.innerHeight - top - 16)}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('scroll', updateHeight, { passive: true });
    const observer = new ResizeObserver(updateHeight);
    observer.observe(document.documentElement);
    return () => { window.removeEventListener('resize', updateHeight); window.removeEventListener('scroll', updateHeight); observer.disconnect(); };
  }, []);
  const totals = calculateFinancialSummary(diagnosis.values, diagnosis.loans ?? []);
  const money = value => formatFinancialMoney(value * 10000);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 769px)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return <aside ref={summaryRef} className="survey-side-summary" aria-label="내 예산과 선택 조건">
    <details open={wide || expanded} onToggle={event => { if (!wide) setExpanded(event.currentTarget.open); }}>
      <summary>{mode === 'cashflow' ? '월 여유금 계산 보기' : '내 예산·선택 조건 보기'}</summary>
      <div className="survey-summary-content">
        {mode === 'cashflow' ? <section className="survey-cashflow">
          <span className="financial-eyebrow">월 예산 미리보기</span>
          <h2>매달 얼마가 남을까요?</h2>
          <p>입력한 금액을 바탕으로 계산했어요.</p>
          <dl><div><dt>월 총수령액</dt><dd>{money(totals.income)}</dd></div><div><dt>생활비 차감</dt><dd>− {money(totals.expenses - totals.loanPayment)}</dd></div><div><dt>대출 상환액 차감</dt><dd>− {money(totals.loanPayment)}</dd></div></dl>
          <div className="survey-cashflow-result"><span>월 유지비로 쓸 수 있는 돈</span><strong>{money(totals.available)}</strong></div>
          <p>{totals.available > 0 ? '이 금액을 기준으로 차량 유지비를 비교해요. 다음 단계에서는 이용 조건과 취향을 골라 주세요.' : '매달 지출을 충당할 여유가 부족해요. 차량 구매 후 남는 예금도 함께 확인해야 해요.'}</p>
        </section> : <>
        <FinancialBudgetSummary values={diagnosis.values} assets={diagnosis.assets} loans={diagnosis.loans} onEdit={onEdit} editingDisabled={editingDisabled} />
        <section className="survey-selected-conditions" aria-labelledby="survey-conditions-title">
          <div className="survey-conditions-heading"><h2 id="survey-conditions-title">선택한 조건</h2>
            <button type="button" className="survey-conditions-toggle" aria-label={`선택한 조건 ${conditionsExpanded ? '접기' : '펼치기'}`} aria-expanded={conditionsExpanded} aria-haspopup="dialog" onClick={() => setConditionsExpanded(true)}><ChevronDown size={theme.iconSize.sm} aria-hidden /></button>
          </div>
          {conditionsExpanded && <AuthModal title="선택한 조건" onClose={() => setConditionsExpanded(false)} size="lg">
            <div className="survey-conditions-modal">
            {items.length ? <dl aria-live="polite">{items.map(item => <div key={item.id}><dt><span className="survey-summary-label">{item.label}</span>{onEdit && <button type="button" className="survey-summary-edit" disabled={editingDisabled} aria-label={`${item.label} 수정`} onClick={() => { setConditionsExpanded(false); onEdit(item.id); }}>수정</button>}</dt><dd>{item.value}</dd></div>)}</dl> : <p>답을 고르면 여기에 정리해 드려요.</p>}
            </div>
          </AuthModal>}
        </section>
        </>}
      </div>
    </details>
  </aside>;
}
