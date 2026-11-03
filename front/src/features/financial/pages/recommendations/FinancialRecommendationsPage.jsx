import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import theme from '../../../../styles/theme.js';
import { isFinancialRecommendationResult } from '../../isFinancialRecommendationResult.js';
import { useVehicle } from '../../../vehicle/useVehicle';
import { buildRecommendationView } from './buildRecommendationView.js';
import RecommendationGrid from './RecommendationGrid.jsx';
import './FinancialRecommendationsPage.css';


export default function FinancialRecommendationsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const diagnosis = state?.diagnosis;
  const result = state?.result;
  const { financialComparison, toggleFinancialComparison, storageError } = useVehicle();
  const comparisonIds = financialComparison?.ids ?? [];
  const [visibleCount, setVisibleCount] = useState(3);
  if (!diagnosis?.values || !isFinancialRecommendationResult(result)) return <Navigate to="/financial" replace />;
  const candidates = result.recommendations.slice(0, 9);
  const views = buildRecommendationView({ ...result, recommendations: candidates });
  const additionalRows = [];
  for (let start = 3; start < Math.min(visibleCount, candidates.length); start += 3) additionalRows.push({ start, candidates: candidates.slice(start, Math.min(start + 3, visibleCount)) });
  const toggleComparison = id => toggleFinancialComparison(id, result, diagnosis);

  return <div className="financial-recommendations-page">
    <header className="recommendations-heading"><div><h1>내 예산에 맞는 추천 차량</h1><p>예산과 취향에 맞는 차량을 비교해 보세요.</p></div></header>
    {storageError && <p role="status">{storageError}</p>}
    <section id="recommended-vehicles" aria-label="추천 차량 목록">
      <div className="financial-recommendations-list-heading"><h2>상위 추천 차량</h2><span>추천 후보 총 {candidates.length}대 · 최대 9대</span></div>
      {candidates.length ? <RecommendationGrid candidates={candidates.slice(0, 3)} preferences={diagnosis.vehicle} views={views} comparisonIds={comparisonIds} onToggleComparison={toggleComparison} /> : <div className="financial-recommendations-empty"><h2>추천 가능한 차량이 없습니다.</h2><p>구매 자금·월 유지비·최소 탑승 인원을 충족하는 차량이 없습니다. 예산이나 이용 조건을 조정해 다시 추천받아 주세요.</p></div>}
    </section>
    <div className="recommendations-result-actions">
      <button type="button" className="financial-previous-button" onClick={() => navigate('/financial/result', { state: { diagnosis, result, comparisonIds } })}><ArrowLeft size={theme.iconSize.sm} aria-hidden="true" />종합 분석 결과</button>
    </div>
    {candidates.length > 3 && <section aria-labelledby="additional-candidates-title">
      <div className="financial-recommendations-list-heading"><h2 id="additional-candidates-title">다른 추천 후보</h2><span>4위부터 최대 9위까지</span></div>
      <div id="additional-candidates" className="candidate-additional-rows">{additionalRows.map(row => <RecommendationGrid key={row.start} candidates={row.candidates} rankOffset={row.start} preferences={diagnosis.vehicle} views={views} comparisonIds={comparisonIds} onToggleComparison={toggleComparison} />)}</div>
      {visibleCount < candidates.length && <button type="button" className="candidate-open-comparison" aria-controls="additional-candidates" aria-expanded={visibleCount > 3} onClick={() => setVisibleCount(count => Math.min(9, count + 3))}>다른 추천 후보 {Math.min(3, candidates.length - visibleCount)}대 더 보기 ({Math.min(visibleCount, candidates.length)}/{candidates.length})</button>}
      {visibleCount >= candidates.length && <p role="status">추천 후보 {candidates.length}대를 모두 표시했어요.{candidates.length === 9 ? ' 화면에는 최대 9대까지 제공합니다.' : ' 현재 재무 조건과 최소 인원을 충족하는 다른 모델은 없어요.'}</p>}
      {visibleCount > 3 && <button type="button" className="financial-recommendations-back" onClick={() => setVisibleCount(3)}>추가 후보 접기</button>}
    </section>}

  </div>;
}
