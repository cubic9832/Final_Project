import { useFinancialLocation, useFinancialNavigate } from '../../financialNavigation.js';
import FinancialMoneyInput from '../../components/FinancialMoneyInput.jsx';
import { useEffect, useRef, useState } from 'react';
import { financialSummarySteps } from '../../surveySummary.js';
import RecommendationSurvey from '../../components/RecommendationSurvey.jsx';
import LoanCalculator from './LoanCalculator.jsx';
import SurveyDialog from '../../components/SurveyDialog.jsx';
import SurveyPages from '../../components/SurveyPages.jsx';
import { formatFinancialMoney } from '../../formatFinancialMoney.js';
import { readFinancialSession, saveFinancialSession } from '../../financialSession.js';
import '../../styles/FinancialPages.css';
import './FinancialPage.css';

const expenseFields = [
  ['housing', '주거비'], ['fixed', '기타 고정 지출'], ['living', '생활비'],
  ['transport', '교통비'], ['phone', '통신비'],
];
const totalExpenses = values => expenseFields.reduce((sum, [key]) => sum + Number(values[key] || 0), 0);


export default function FinancialPage() {
  const { state: routeState } = useFinancialLocation();
  const [state] = useState(() => ({ ...readFinancialSession(), ...routeState }));
  const navigate = useFinancialNavigate();
  const formRef = useRef(null);
  const [step, setStep] = useState(() => Number.isInteger(routeState?.financialStep) ? Math.min(4, Math.max(0, routeState.financialStep)) : 0);
  useEffect(() => {
    const form = formRef.current;
    const preventWheelChange = event => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'number') event.preventDefault();
    };
    form.addEventListener('wheel', preventWheelChange, { passive: false });
    return () => form.removeEventListener('wheel', preventWheelChange);
  }, []);
  const [values, setValues] = useState(() => ({
    income: state?.values?.income === undefined ? '' : String(Number(state.values.income || 0) + Number(state.values.extraIncome || 0)),
    monthlyExpenses: state?.values?.monthlyExpenses ?? (state?.values ? String(totalExpenses(state.values)) : ''),
  }));
  const [deposit, setDeposit] = useState(state?.assets?.deposit ?? '');
  const [loanPayment, setLoanPayment] = useState(() => state?.loanPayment ?? String((state?.loans ?? []).reduce((sum, loan) => sum + Number(loan.payment || 0), 0)));
  const [loanDetails, setLoanDetails] = useState(() => state?.loanDetails ?? (state?.loans ?? []).filter(loan => loan.id).map(loan => ({ ...loan })));
  const [detailedLoans, setDetailedLoans] = useState(state?.detailedLoans ?? false);
  const [breakdown, setBreakdown] = useState(state?.expenseBreakdown ?? state?.values ?? {});
  const [detailed, setDetailed] = useState(state?.detailed ?? false);
  const [errors, setErrors] = useState({});
  const [editor, setEditor] = useState(null);
  const [expenseDraft, setExpenseDraft] = useState({});
  const [loanDraft, setLoanDraft] = useState([]);
  const openExpenses = () => { setExpenseDraft({ ...breakdown }); setEditor('expenses'); };
  const openLoans = () => { setLoanDraft(loanDetails.map(loan => ({ ...loan }))); setEditor('loans'); };
  const loans = detailedLoans ? loanDetails : [{ payment: loanPayment || '0' }];
  const totalLoanPayment = loans.reduce((sum, loan) => sum + Number(loan.payment || 0), 0);

  useEffect(() => {
    saveFinancialSession({
      values, assets: { deposit },
      loans: detailedLoans ? loanDetails : [{ payment: loanPayment || '0' }],
      loanPayment, loanDetails, detailedLoans, expenseBreakdown: breakdown, detailed,
    });
  }, [values, deposit, loanPayment, loanDetails, detailedLoans, breakdown, detailed]);

  function input(name, label, value, onChange, { required = false, help, readOnly = false } = {}) {
    return <div className="financial-field" key={name}>
      <label htmlFor={`financial-${name}`}>{label}{required ? <span className="financial-required"> </span> : ' (선택)'}</label>
      <div className="financial-input-wrap"><FinancialMoneyInput id={`financial-${name}`} placeholder="0" required={required} readOnly={readOnly} value={value} onValueChange={next => { onChange(next); setErrors(previous => ({ ...previous, [name]: '' })); }} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : help ? `${name}-help` : undefined} onInvalid={event => { event.preventDefault(); const message = event.currentTarget.validationMessage; setErrors(previous => ({ ...previous, [name]: message })); }} /><span aria-hidden="true">만 원</span></div>
      {help && <p className="financial-input-help" id={`${name}-help`}>{help}</p>}
      {Number(value) >= 10000 && <p className="financial-input-help">{formatFinancialMoney(Number(value) * 10000)}</p>}
      {errors[name] && <p className="financial-field-error" id={`${name}-error`} role="alert">{errors[name]}</p>}
    </div>;
  }

  function changeMode(next) {
    if (next && totalExpenses(breakdown) !== Number(values.monthlyExpenses || 0)) setBreakdown({ living: values.monthlyExpenses || '0' });
    if (next && values.monthlyExpenses === '') setValues(previous => ({ ...previous, monthlyExpenses: '0' }));
    setDetailed(next);
  }

  const questions = [
    { id: 'income', category: '매달 들어오는 돈', title: '한 달에 얼마를 받으세요?', description: '세금을 뺀 월급에 정기적으로 받는 다른 소득도 더해 주세요.' },
    { id: 'expenses', category: '매달 쓰는 돈', title: '생활비로 매달 얼마를 쓰세요?', description: '집세, 식비, 교통비 등을 합쳐 주세요. 대출 갚는 돈은 다음에 따로 물어볼게요.' },
    { id: 'loans', category: '매달 갚는 돈', title: '대출을 갚는 데 얼마를 쓰세요?', description: '매달 갚는 원금과 이자를 합쳐 주세요. 대출이 없다면 0으로 두면 돼요.' },
    { id: 'deposit', category: '차에 쓸 수 있는 목돈', title: '모아둔 돈이 있나요?', description: '차량을 구매하기 위해 준비해 둔 목돈 액수를 작성해 주세요.' },
    { id: 'finance-review', category: '내 예산 확인', title: '입력한 금액이 맞나요?', description: '이 금액으로 차량 구매와 매달 유지비를 감당할 수 있는지 살펴볼게요.' },
  ];
  const question = questions[step];
  const diagnosis = { values, assets: { deposit }, loans, detailedLoans, detailed, vehicle: readFinancialSession().vehicle ?? state?.vehicle, expenseBreakdown: breakdown };
  function next() {
    if (step === 2 && detailedLoans && loanDetails.some(loan => loan.payment === '')) {
      setErrors(previous => ({ ...previous, loanPayment: '등록한 대출의 월 상환액을 계산하거나 직접 입력해 주세요.' }));
      return;
    }
    if (step < questions.length - 1) { setStep(step + 1); return; }
    const fields = [[values.income, 0], [values.monthlyExpenses, 1], [deposit, 3]];
    const invalid = fields.find(([value]) => value === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 9999999999.99);
    if (invalid) { setStep(invalid[1]); return; }
    navigate('/financial/environment', { state: diagnosis });
  }
  const reviewRows = [
    ['월 총수령액', values.income, 0], ['월 생활비', values.monthlyExpenses, 1],
    ['월 대출 상환액', totalLoanPayment, 2], ['차량 구매·유지용 목돈', deposit, 3],
  ];
  return <RecommendationSurvey phase="재무 정보" index={step} total={questions.length} question={question} diagnosis={diagnosis} onBudgetChange={changes => {
    if (changes.assets) setDeposit(changes.assets.deposit);
    if (changes.values) { setValues(changes.values); if ('detailed' in changes) { setBreakdown(changes.expenseBreakdown); setDetailed(changes.detailed); } if ('loanPayment' in changes) { setLoanPayment(changes.loanPayment); setLoanDetails(changes.loanDetails); setDetailedLoans(changes.detailedLoans); } }
  }} formRef={formRef} canGoBack={step > 0} onEditSummary={id => { if (id in financialSummarySteps) setStep(financialSummarySteps[id]); }}
    onBack={() => step ? setStep(step - 1) : navigate('/')} onNext={next}
    nextLabel={step === questions.length - 1 ? '이제 이용 조건 고르기' : '다음'}>
    <div className="financial-survey-input">
      {step === 0 && input('income', '월 총수령액', values.income, value => setValues(previous => ({ ...previous, income: value })), { required: true, help: '모든 금액은 만 원 단위예요. 예: 300만 원이면 300' })}
      {step === 1 && <>
        {input('monthlyExpenses', '월 생활비 합계', values.monthlyExpenses, value => setValues(previous => ({ ...previous, monthlyExpenses: value })), { required: true, readOnly: detailed, help: '지출이 없으면 0을 입력해 주세요.' })}
        <fieldset className="financial-expense-mode"><legend>생활비 입력 방법</legend><div className="financial-mode-options"><label><input type="radio" name="expenseMode" checked={!detailed} onChange={() => changeMode(false)} /> 합계로 입력</label><label><input type="radio" name="expenseMode" checked={detailed} onChange={() => changeMode(true)} /> 항목별로 계산</label></div></fieldset>
        {detailed && <button type="button" className="survey-detail-button" onClick={openExpenses}>생활비 세부 항목 입력·수정</button>}
      </>}
      {step === 2 && <>
        {input('loanPayment', '월 대출 상환액 합계', detailedLoans ? String(totalLoanPayment) : loanPayment, setLoanPayment, { readOnly: detailedLoans, help: '앞에서 입력한 생활비와 겹치지 않게 입력해 주세요.' })}
        <fieldset className="financial-expense-mode"><legend>상환액 입력 방법</legend><div className="financial-mode-options"><label><input type="radio" name="loanMode" checked={!detailedLoans} onChange={() => { setLoanPayment(String(totalLoanPayment)); setDetailedLoans(false); }} /> 합계로 입력</label><label><input type="radio" name="loanMode" checked={detailedLoans} onChange={() => { if (!loanDetails.length && Number(loanPayment) > 0) setLoanDetails([{ id: crypto.randomUUID(), type: '기타 대출', balance: '', rate: '', months: '', payment: loanPayment }]); setDetailedLoans(true); }} /> 대출별로 계산</label></div></fieldset>
        {detailedLoans && <button type="button" className="survey-detail-button" onClick={openLoans}>대출 {loanDetails.length}건 입력·수정</button>}
      </>}
      {step === 3 && input('deposit', '사용 가능한 목돈의 액수', deposit, setDeposit, { required: true })}
      {step === 4 && <SurveyPages>{reviewRows.map(([label, value, target]) => <li key={label}><span><small>{label}</small><strong>{formatFinancialMoney(Number(value || 0) * 10000)}</strong></span><button type="button" onClick={() => setStep(target)} aria-label={`${label} 수정`}>수정</button></li>)}</SurveyPages>}
    </div>
    {editor && <SurveyDialog title={editor === 'expenses' ? '생활비 세부 항목' : '대출별 상환액 계산'} onClose={() => setEditor(null)} dirty={editor === 'expenses' ? JSON.stringify(expenseDraft) !== JSON.stringify(breakdown) : JSON.stringify(loanDraft) !== JSON.stringify(loanDetails)} onSave={() => {
      if (editor === 'expenses') { setBreakdown(expenseDraft); setValues(previous => ({ ...previous, monthlyExpenses: String(totalExpenses(expenseDraft)) })); }
      else { if (loanDraft.some(loan => loan.payment === '')) return; setLoanDetails(loanDraft); setErrors(previous => ({ ...previous, loanPayment: '' })); }
      setEditor(null);
    }}><div className="financial-dialog-total"><label htmlFor="financial-dialog-total">{editor === 'expenses' ? '월 생활비 합계' : '월 대출 상환액 합계 (선택)'}</label><div><output id="financial-dialog-total" aria-live="polite" aria-atomic="true">{(editor === 'expenses' ? totalExpenses(expenseDraft) : loanDraft.reduce((sum, loan) => sum + Number(loan.payment || 0), 0)).toLocaleString('ko-KR', { maximumFractionDigits: 4 })}</output><span>만 원</span></div></div><div className="financial-survey-input">{editor === 'expenses' ? <div className="financial-fields">{expenseFields.map(([key, label]) => input(key, label, expenseDraft[key] ?? '', value => setExpenseDraft(previous => ({ ...previous, [key]: value }))))}</div> : <><LoanCalculator loans={loanDraft} onChange={setLoanDraft} />{loanDraft.some(loan => loan.payment === '') && <p role="status">각 대출의 월 상환액을 계산하거나 입력해 주세요.</p>}</>}</div></SurveyDialog>}
  </RecommendationSurvey>;
}
