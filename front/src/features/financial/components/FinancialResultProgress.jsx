import './FinancialResultProgress.css';

export default function FinancialResultProgress() {
  return <><div className="result-progress-label"><span>종합 결과</span><span>7 / 7</span></div><progress className="result-progress" value={7} max={7} aria-label="종합 결과 진행 상황" /></>;
}
