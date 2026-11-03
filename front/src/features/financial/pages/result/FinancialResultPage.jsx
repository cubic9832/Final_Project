import { useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import FinancialResultProgress from '../../components/FinancialResultProgress.jsx';
import FinancialAnalysis from '../recommendations/FinancialAnalysis.jsx';
import './FinancialResultPage.css';
import { calculateFinancialSummary } from '../../calculateFinancialSummary.js';
import { buildDiagnosisSummary } from '../../diagnosisSummary.js';
import { saveDiagnosis } from '../../../auth/memberApi';
import useAuthStore from '../../../../stores/useAuthStore';
import { isFinancialRecommendationResult } from '../../isFinancialRecommendationResult.js';
import '../recommendations/FinancialRecommendationsPage.css';

// 마이페이지 "최근 재무 진단": 로그인한 회원이면 이 결과를 한 번만 저장한다
// (개발 모드에서 화면이 두 번 그려져도 같은 결과는 한 번 — 메모리 표시, 새로고침해도 한 번 — 주소 기록의 diagnosisSaved)
const savedResults = new WeakSet();

export default function FinancialResultPage() {
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  const member = useAuthStore((store) => store.member);
  const ready = Boolean(state?.diagnosis?.values) && isFinancialRecommendationResult(state?.result);
  // 저장이 늦게 끝났을 때 이미 다른 화면(추천 차량 등)으로 떠났으면 결과 화면으로 되돌리지 않기 위한 표시
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => {
    if (!ready || !member || state.diagnosisSaved || savedResults.has(state.result)) return;
    savedResults.add(state.result);
    saveDiagnosis(buildDiagnosisSummary(state.diagnosis, state.result))
      .then(() => { if (mountedRef.current) navigate(pathname, { replace: true, state: { ...state, diagnosisSaved: true } }); })
      .catch(() => savedResults.delete(state.result)); // 저장 실패는 결과 보기를 막지 않는다 (다음에 다시 시도)
  }, [ready, member, state, pathname, navigate]);
  if (!state?.diagnosis?.values || !isFinancialRecommendationResult(state?.result)) return <Navigate to={state?.values ? '/financial/vehicle' : '/financial'} state={state} replace />;
  const { diagnosis, result } = state;
  return <div className="financial-result-page">
    <header className="result-heading">
      <div><h1>재무 진단 결과</h1><p>구매 예산과 월 유지비, 차량 구매 후 남는 자금을 확인해 보세요.</p></div>
    </header>
    <FinancialResultProgress />
    <FinancialAnalysis totals={calculateFinancialSummary(diagnosis.values, diagnosis.loans ?? [])} result={result} compact />
    <div className="result-actions"><button type="button" className="result-edit" onClick={() => navigate('/financial/vehicle', { state: { ...diagnosis, returnToVehicleReview: true } })}>차량 취향 수정</button><button type="button" className="result-next" onClick={() => navigate('/financial/recommendations', { state })}>추천 차량 보기</button></div>
  </div>;
}
