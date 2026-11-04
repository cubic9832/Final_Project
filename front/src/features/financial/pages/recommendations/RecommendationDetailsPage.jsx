import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Car } from 'lucide-react';
import LoginRequiredModal from '../../../auth/components/LoginRequiredModal.jsx';
import useAuthStore from '../../../../stores/useAuthStore.js';
import theme from '../../../../styles/theme.js';
import { isFinancialRecommendationResult } from '../../isFinancialRecommendationResult.js';
import { buildRecommendationView } from './buildRecommendationView.js';
import { candidateImage, candidateMoney } from './candidatePresentation.js';
import VehiclePreferenceSummary from './VehiclePreferenceSummary.jsx';
import './FinancialRecommendationsPage.css';
import './RecommendationDetailsPage.css';

export default function RecommendationDetailsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [loginRequired, setLoginRequired] = useState(false);
  const [params, setParams] = useSearchParams();
  const accessToken = useAuthStore(store => store.accessToken);
  const initialized = useAuthStore(store => store.initialized);
  const [failedSrc, setFailedSrc] = useState(null);
  if (!state?.diagnosis?.values || !isFinancialRecommendationResult(state?.result)) return <Navigate to="/financial" replace />;
  const candidates = state.result.recommendations.slice(0, 9);
  if (!candidates.length) return <Navigate to="/financial/recommendations" state={state} replace />;
  const parsedIndex = Number(params.get('index') || 0);
  const index = Number.isInteger(parsedIndex) ? Math.max(0, Math.min(candidates.length - 1, parsedIndex)) : 0;
  if (!initialized) return <p role="status">로그인 상태를 확인하는 중입니다…</p>;
  if (index >= 3 && !accessToken) return <Navigate to="/login" replace />;
  const candidate = candidates[index];
  const { vehicle, cost } = candidate;
  const view = buildRecommendationView({ ...state.result, recommendations: candidates })[index];
  const image = candidateImage(vehicle);
  function move(next) {
    if (next >= 3 && !accessToken) {
      setLoginRequired(true);
      return;
    }
    setParams({ index: String(next) }, { state, replace: true });
  }
  return <div className="financial-recommendations-page recommendation-details-page">
    {loginRequired && <LoginRequiredModal onClose={() => setLoginRequired(false)} onLogin={() => navigate('/login')} />}
    <header className="recommendations-heading"><h1>추천 차량 상세 정보</h1><p>차량별 추천 근거와 구매 후 자금을 확인해 보세요.</p></header>
    <nav className="recommendation-carousel-controls" aria-label="추천 차량 이동">
      <button disabled={index === 0} aria-label="이전 추천 차량" onClick={() => move(index - 1)}><ChevronLeft size={theme.iconSize.md} aria-hidden />이전 차량</button>
      <span aria-live="polite">{index + 1} / {candidates.length}</span>
      <button disabled={index === candidates.length - 1} aria-label="다음 추천 차량" onClick={() => move(index + 1)}>다음 차량<ChevronRight size={theme.iconSize.md} aria-hidden /></button>
    </nav>
    <article className="recommendation-details-card" key={vehicle.id}>
      <div className="recommendation-details-hero">
        <div className="recommendation-details-image">{image && failedSrc !== image.src ? <img src={image.src} alt={image.alt} onError={() => setFailedSrc(image.src)} /> : <Car size={theme.iconSize.lg} aria-label="차량 이미지 준비 중" />}</div>
        <div><p>추천 {index + 1} · {vehicle.brand}</p><h2>{vehicle.model}</h2><p>{vehicle.year && `${vehicle.year}년형 · `}{vehicle.trim}</p><strong>{candidateMoney(vehicle.price)}</strong></div>
      </div>
      <dl className="financial-recommendation-specs">{[['구매 후 남는 예금', view.financial?.cashAfterPurchase], ['유지비 지출 후 월 잔여금', cost.remaining_monthly]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{candidateMoney(value)}</dd></div>)}</dl>
      {view?.financial?.fundingSource === 'assets' && <p className="financial-candidate-alert">예금에서 매월 {candidateMoney(view.financial.monthlyAssetDrawdown)}을 사용해요. 구매 후 예금으로 약 {view.financial.assetRunwayMonths}개월 유지할 수 있어요.</p>}
      <section className="financial-recommendation-reasons" aria-label={`${vehicle.model} 맞는 조건`}>
        <h3>맞는 조건</h3>
        <ul>{view.matches.slice(0, 2).map(item => <li key={item.key}><p>{item.text}</p></li>)}</ul>
        {!view.matches.length && <p className="candidate-condition-note">{view.evidence ? '지정한 연료·크기·정원 중 일치가 확인된 선호가 없어요. 구매 가능 여부와 비용도 함께 비교해 주세요.' : '조건별 평가 근거를 불러오지 못했어요. 조건을 다시 적용해 추천받아 주세요.'}</p>}
      </section>
      <section className="candidate-tradeoffs" aria-label={`${vehicle.model} 다른 조건`}>
        <h3>다른 조건 · 확인할 점</h3>{candidate.preferenceCompromise && <p>일부 선호 조건을 조정한 절충 후보예요.</p>}
        <ul>{[...view.mismatches, ...view.unknowns].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 2).map(item => <li key={item.key}>{item.text}</li>)}</ul>
        {!view.mismatches.length && !view.unknowns.length && view.evidence && <p>지정한 연료·크기·정원에서 확인된 불일치가 없어요.</p>}
      </section>
      <VehiclePreferenceSummary vehicle={vehicle} specifications={candidate.lifestyleEvidence?.specifications} values={candidate.lifestyleEvidence?.values} evidence={candidate.lifestyleEvidence?.evidence} />

    </article>
    <button className="financial-previous-button recommendation-details-back" onClick={() => navigate('/financial/recommendations', { state })}><ArrowLeft size={theme.iconSize.sm} aria-hidden />추천 차량 목록</button>
  </div>;
}
