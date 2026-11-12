import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChartNoAxesCombined, CarFront, Plus, Trophy } from 'lucide-react';
import { useVehicle } from '../../../vehicle/useVehicle';
import VehicleCatalogGate from '../../../vehicle/components/VehicleCatalogGate.jsx';
import { calculateSavingsProgress, currentDate, deleteSavingRecord, formatMoney, getSavingRecords, isProgressPlan, progressStorageKey, shiftMonth } from '../../savingsProgress';
import theme from '../../../../styles/theme';
import Modal from '../../../../shared/ui/Modal.jsx';
import SavingsProgressChart from './SavingsProgressChart';
import DailySavingForm from './DailySavingForm';
import RecurringSavingsSettings from './RecurringSavingsSettings';
import { applyRecurringSavings, isRecurringRule } from '../../recurringSavings';
import { purchasePlanUpdatedEvent } from '../../purchasePlanSync';
import SavingsRecordHistory from './SavingsRecordHistory';
import DreamCarPageHeader from '../../components/DreamCarPageHeader';
import './SavingsProgressPage.css';

function readProgress() {
  try {
    const raw = localStorage.getItem(progressStorageKey);
    if (!raw) return { plans: [], error: '' };
    const plans = JSON.parse(raw);
    if (!Array.isArray(plans) || !plans.every(plan => isProgressPlan(plan) && (plan.recurringRules === undefined || Array.isArray(plan.recurringRules) && plan.recurringRules.every(isRecurringRule)))) throw new Error();
    const updated = plans.map(plan => applyRecurringSavings(plan, currentDate()));
    if (updated.some((plan, index) => plan !== plans[index])) localStorage.setItem(progressStorageKey, JSON.stringify(updated));
    return { plans: updated, error: '' };
  } catch { return { plans: [], error: '저장된 실행 기록을 읽을 수 없습니다. 브라우저 저장 공간 또는 데이터 상태를 확인해 주세요. 기존 데이터를 덮어쓰지 않았습니다.' }; }
}
export default function SavingsProgressPage() {
  const { planningVehicles } = useVehicle();
  return <VehicleCatalogGate>{planningVehicles.length ? <SavingsProgressPageContent /> : <p role="status">차량 카탈로그가 비어 있습니다.</p>}</VehicleCatalogGate>;
}

function SavingsProgressPageContent() {
  const [asOfDate, setAsOfDate] = useState(currentDate);
  const asOfMonth = asOfDate.slice(0, 7);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordDirty, setRecordDirty] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [state, setState] = useState(readProgress);
  useEffect(() => {
    function refresh() { setAsOfDate(currentDate()); setState(readProgress()); }
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    function refreshSaved() { setState(readProgress()); }
    window.addEventListener('storage', refreshSaved);
    window.addEventListener(purchasePlanUpdatedEvent, refreshSaved);
    return () => { window.removeEventListener('storage', refreshSaved); window.removeEventListener(purchasePlanUpdatedEvent, refreshSaved); };
  }, []);
  const [notice, setNotice] = useState('');
  const plan = state.plans.at(-1);
  const summary = plan ? calculateSavingsProgress(plan, asOfMonth) : null;
  const editingRecord = plan ? getSavingRecords(plan).find(record => record.id === editingId) : null;
  function persist(plans, message) {
    if (state.error) { setNotice('저장된 데이터 오류를 먼저 확인해 주세요. 기존 기록을 덮어쓰지 않았습니다.'); return false; }
    try { localStorage.setItem(progressStorageKey, JSON.stringify(plans)); setState({ plans, error: '' }); setNotice(message); window.dispatchEvent(new Event(purchasePlanUpdatedEvent)); return true; } catch { setNotice('저장 공간을 사용할 수 없어 저장하지 못했습니다. 입력값을 유지했으니 다시 시도해 주세요.'); return false; }
  }
  function closeRecordModal() { setRecordModalOpen(false); setEditingId(null); setRecordDirty(false); }
  function openRecordModal(id = null) { setEditingId(id); setRecordDirty(false); setRecordModalOpen(true); }
  const rows = plan ? Array.from({ length: Math.min(summary.elapsed, 600) }, (_, index) => {
    const month = shiftMonth(asOfMonth, -index);
    const result = calculateSavingsProgress(plan, month);
    return { month, ...result };
  }) : [];
  return <div className="savings-page">
    <DreamCarPageHeader title="드림카, 꿈에서 내 차로." description="저장한 구매 계획을 바탕으로 저축 현황을 관리하세요." />
    {state.error && <p className="savings-error" role="alert">{state.error}</p>}
    {notice && <p className="savings-notice" role="status">{notice}</p>}
    {!plan ? <section className="savings-card savings-empty"><ChartNoAxesCombined size={theme.iconSize.lg} aria-hidden /><h2>저축의 첫 기록을 기다리고 있어요</h2><p>계획을 시작하고 매달 저축액을 기록해 보세요.<br />목표와 실제 누적액, 이번 달 부족액을 한눈에 확인할 수 있습니다.</p><Link className="savings-button navy" to="/dream-car">구매 계획 만들기</Link></section> : <>
      {summary.remaining === 0 && <section className="savings-achievement" role="status"><Trophy size={theme.iconSize.lg} aria-hidden /><div><h2>드림카 자금 준비 완료!</h2><p>목표 {formatMoney(plan.target)}을 달성했어요. 지금까지 {formatMoney(summary.total)}을 모았습니다.{summary.total > plan.target && ` 목표보다 ${formatMoney(summary.total - plan.target)} 더 모았어요.`}</p></div><strong>100% 달성</strong></section>}

      <div className="savings-main-grid"><div className="savings-main-content"><section className="savings-card savings-overview">
        <div className="savings-progress-heading"><span>04</span><h2>저축 실행 현황</h2><ChartNoAxesCombined size={theme.iconSize.lg} aria-hidden /></div>
        <div className="savings-trend-heading"><h2>저축 추이</h2><span>월말 누적 기준</span></div><SavingsProgressChart key={plan.id} {...{ plan, asOfMonth }} />
      </section>
        <div className="savings-flow-actions"><Link className="savings-previous" to="/dream-car" state={{ returnToSummary: true }}><ArrowLeft size={theme.iconSize.sm} aria-hidden />이전</Link><button type="button" className="savings-button navy" disabled={(plan.startDate || `${plan.startMonth}-01`) > asOfDate} onClick={() => openRecordModal()}><Plus size={theme.iconSize.sm} aria-hidden />저축 기록하기</button></div>
        <SavingsRecordHistory plan={plan} onEdit={openRecordModal} onDelete={id => { try { const next = deleteSavingRecord(plan, id); const saved = persist(state.plans.map(item => item.id === plan.id ? next : item), '저축 기록을 삭제하고 월 합계와 차트를 갱신했습니다.'); if (saved && editingId === id) setEditingId(null); return saved; } catch (failure) { setNotice(failure.message); return false; } }} />
        <section className="savings-card savings-history"><div className="savings-section-heading"><h2>월별 실행 기록</h2><span className="savings-caption">최근 월부터 표시</span></div><div className="savings-table-scroll"><table><caption className="savings-sr-only">월별 목표 저축액과 실제 저축액, 누적액 비교</caption><thead><tr><th scope="col">월</th><th scope="col">목표 저축</th><th scope="col">실제 저축</th><th scope="col">목표 대비</th><th scope="col">기록 누적액</th><th scope="col">메모</th></tr></thead><tbody>{rows.map(row => <tr key={row.month}><th scope="row">{row.month}</th><td>{formatMoney(row.monthlyGoal)}</td><td>{row.currentEntry ? formatMoney(row.currentEntry.amount) : <span className="savings-unrecorded">미기록</span>}</td><td>{row.monthlyGap === null ? '미기록' : row.monthlyGap < 0 ? `${formatMoney(-row.monthlyGap)} 부족` : row.monthlyGap > 0 ? `${formatMoney(row.monthlyGap)} 초과` : '달성'}</td><td>{formatMoney(row.total)}</td><td>{row.currentEntry?.memo || '—'}</td></tr>)}</tbody></table></div></section></div>
        <aside className="savings-sidebar">
          <section className="savings-card savings-goal-card"><p className="savings-overline">나의 드림카</p><div className="savings-goal-vehicle"><span className="savings-icon"><CarFront size={theme.iconSize.lg} aria-hidden /></span><div><h2>{plan.name}</h2><p>{plan.trim}</p></div></div>
            <dl><div><dt>구매 목표 자금</dt><dd>{formatMoney(plan.target)}</dd></div></dl><div className="savings-goal-card-progress"><div><span>목표 달성률</span><strong>{summary.progress.toFixed(1)}%</strong></div><progress value={summary.progress} max="100" aria-label="최종 목표 달성률" /><p>{summary.remaining === 0 ? '목표 자금을 모두 모았어요!' : `내 차를 만나기까지 ${formatMoney(summary.remaining)} 남았어요.`}</p></div><dl><div><dt>남은 금액</dt><dd>{formatMoney(summary.remaining)}</dd></div><div><dt>계획한 달성 시점</dt><dd>{summary.targetMonth.replace('-', '년 ')}월</dd></div><div><dt>매월 저축 목표</dt><dd>{formatMoney(plan.monthlySaving)}</dd></div></dl>
            <div className="savings-goal-card-month"><div><span>이번 달 저축</span><span>월 목표 {formatMoney(summary.monthlyGoal)}</span></div><strong>{summary.currentEntry ? formatMoney(summary.currentEntry.amount) : '첫 저축을 기록해 보세요'}</strong></div>
            {(plan.startDate || `${plan.startMonth}-01`) > asOfDate && <p className="savings-caption">{plan.startDate || `${plan.startMonth}-01`}부터 기록할 수 있어요.</p>}

          </section>
          <RecurringSavingsSettings key={plan.id} plan={plan} asOfDate={asOfDate} onSave={(next, message) => persist(state.plans.map(item => item.id === plan.id ? next : item), message)} />

        </aside></div>
      {recordModalOpen && <Modal title={editingRecord ? '저축 기록 수정' : '저축 기록하기'} subtitle="작은 저축도 내 차를 향한 한 걸음이에요." size="md" isDirty={recordDirty} onClose={closeRecordModal}>
        {requestClose => <div className="savings-record-modal"><DailySavingForm key={`${plan.id}-${editingRecord?.id || 'new'}`} {...{ plan, asOfDate }} record={editingRecord} onDirtyChange={setRecordDirty} onCancel={requestClose} onSaved={closeRecordModal} onSave={next => persist(state.plans.map(item => item.id === plan.id ? next : item), '저축 기록을 저장했습니다. 월 합계와 차트에 반영했어요.')} /></div>}
      </Modal>}
    </>}
  </div>;
}
