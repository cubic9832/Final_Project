import { Link } from 'react-router-dom';
import { isFinancialRecommendationResult } from '../../isFinancialRecommendationResult.js';
import CandidateComparisonTable from './CandidateComparisonTable.jsx';
import { buildRecommendationView } from './buildRecommendationView.js';
import './FinancialRecommendationsPage.css';

export default function FinancialCandidateComparison({ result, diagnosis, selectedIds, canToggleVehicles = true, recommendationState, presetViews, children }) {
  const views = isFinancialRecommendationResult(result) ? buildRecommendationView(result) : [];
  const selected = presetViews ?? (selectedIds ?? []).map(id => views.find(view => view.id === id)).filter(Boolean);
  if (!selected.length || (!presetViews && !diagnosis?.values)) return <section className="financial-recommendations-empty">
    <h1>추천 비교 정보를 확인할 수 없습니다.</h1><p>선택한 차량 정보를 찾을 수 없어요. 추천 결과에서 차량을 다시 선택해 주세요.</p>
    <Link to="/financial">재무 정보 입력하기</Link>
  </section>;
  return <div className="financial-recommendations-page">
    <header className="recommendations-heading"><div><h1>차량 비교</h1><p>차량별 구매 비용과 예상 유지비, 제원을 비교합니다.</p></div><span>담은 차량 {selected.length} / 3</span></header>
    <CandidateComparisonTable views={selected} canToggleVehicles={canToggleVehicles} />
    {children ?? <div className="financial-recommendations-actions">
      <Link className="candidate-open-comparison" to="/financial/recommendations" state={{ ...(recommendationState ?? { diagnosis, result }), comparisonIds: selectedIds }}>추천 결과로 돌아가기</Link>
      <Link className="candidate-open-comparison" to="/financial/vehicle" state={diagnosis}>차량 취향 수정하기</Link>
    </div>}
  </div>;
}
