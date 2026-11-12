import { useFinancialLocation, useFinancialNavigate } from '../../financialNavigation.js';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoginRequiredModal from '../../../auth/components/LoginRequiredModal.jsx';
import useAuthStore from '../../../../stores/useAuthStore.js';
import theme from '../../../../styles/theme.js';
import { isFinancialRecommendationResult } from '../../isFinancialRecommendationResult.js';
import { useVehicle } from '../../../vehicle/useVehicle';
import { buildRecommendationView } from './buildRecommendationView.js';
import RecommendationGrid from './RecommendationGrid.jsx';
import './FinancialRecommendationsPage.css';


export default function FinancialRecommendationsPage() {
  const { state } = useFinancialLocation();
  const navigate = useFinancialNavigate();
  const [loginRequired, setLoginRequired] = useState(false);
  const accessToken = useAuthStore(store => store.accessToken);
  const initialized = useAuthStore(store => store.initialized);
  const diagnosis = state?.diagnosis;
  const result = state?.result;
  const { financialComparison, toggleFinancialComparison, storageError } = useVehicle();
  const comparisonIds = financialComparison?.ids ?? [];
  if (!diagnosis?.values || !isFinancialRecommendationResult(result)) return <Navigate to="/financial" replace />;
  const candidates = result.recommendations.slice(0, 9);
  const views = buildRecommendationView({ ...result, recommendations: candidates });
  const toggleComparison = id => toggleFinancialComparison(id, result, diagnosis);

  function openAdditionalRecommendations() {
    if (!accessToken) {
      setLoginRequired(true);
      return;
    }
    navigate('/financial/recommendations/details?index=3', { state: { diagnosis, result } });
  }

  return <div className="financial-recommendations-page">
    {loginRequired && <LoginRequiredModal onClose={() => setLoginRequired(false)} onLogin={() => navigate('/login', { state: { from: '/financial/recommendations', resumeFinancial: state } })} />}
    <header className="recommendations-heading"><div><h1>내 예산에 맞는 추천 차량</h1><p>예산과 취향에 맞는 차량을 비교해 보세요.</p></div></header>
    {storageError && <p role="status">{storageError}</p>}
    <section id="recommended-vehicles" aria-label="추천 차량 목록">
      <div className="financial-recommendations-list-heading"><h2>상위 추천 차량</h2><span>추천 후보 총 {candidates.length}대 · 최대 9대</span></div>
      {candidates.length ? <RecommendationGrid candidates={candidates.slice(0, 3)} preferences={diagnosis.vehicle} views={views} comparisonIds={comparisonIds} onToggleComparison={toggleComparison} /> : <div className="financial-recommendations-empty"><h2>추천 가능한 차량이 없습니다.</h2><p>구매 자금·월 유지비·최소 탑승 인원을 충족하는 차량이 없습니다. 예산이나 이용 조건을 조정해 다시 추천받아 주세요.</p></div>}
    </section>
    <div className="recommendations-result-actions">
      <button type="button" className="financial-previous-button" onClick={() => navigate('/financial/result', { state: { diagnosis, result, comparisonIds } })}><ArrowLeft size={theme.iconSize.sm} aria-hidden="true" />종합 분석 결과</button>
      {candidates.length > 3 && <button type="button" className="candidate-open-comparison" disabled={!initialized} onClick={openAdditionalRecommendations}>추가 추천 차량 보기</button>}
    </div>


  </div>;
}
