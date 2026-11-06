import { useFinancialLocation, useFinancialNavigate } from '../../financialNavigation.js';
import { useState } from 'react';
import { Car } from 'lucide-react';
import theme from '../../../../styles/theme.js';
import { candidateImage, candidateMoney, fuelLabels } from './candidatePresentation.js';
import ExplainTerm from '../../../chatbot/ExplainTerm';
import { Link } from 'react-router-dom';



export default function RecommendationCard({ candidate, rank, comparisonSelected, comparisonFull, onToggleComparison }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const navigate = useFinancialNavigate();
  const { state } = useFinancialLocation();
  const { vehicle, cost } = candidate;
  const image = candidateImage(vehicle);

  return <li className="financial-recommendation-card">
    <div className="financial-recommendation-media"><span className="financial-recommendation-rank">{candidate.seatingVerificationRequired || candidate.lengthVerificationRequired ? '확인 후보' : '추천'} {rank}</span>
      {image && failedSrc !== image.src ? <img key={image.src} src={image.src} alt={image.alt} style={{ ...image.style, objectFit: "contain", objectPosition: "center", transform: "none", position: "static", inset: "auto", maxWidth: "100%", maxHeight: "100%", width: "100%", height: "100%" }} loading="lazy" onError={() => setFailedSrc(image.src)} /> : <div className="financial-recommendation-image-placeholder"><Car size={theme.iconSize.lg} aria-hidden="true" /><span>차량 이미지 준비 중</span></div>}
    </div>
    <div className="financial-recommendation-card-body">
      <div className="financial-recommendation-aligned-summary"><div data-recommendation-measure="summary">
      <p className="financial-recommendation-category">{vehicle.brand} · <ExplainTerm term={vehicle.original_fuel || vehicle.fuel} context={`추천 차량 ${vehicle.brand} ${vehicle.model}의 연료 종류`}>{{MILD_HYBRID: '마일드 하이브리드', PHEV: '플러그인 하이브리드'}[vehicle.original_fuel] || fuelLabels[vehicle.fuel] || vehicle.fuel}</ExplainTerm></p>
      {onToggleComparison && <div className="candidate-comparison-actions"><label className="candidate-comparison-select"><input type="checkbox" aria-label={`${vehicle.model} 비교 선택`} checked={comparisonSelected} disabled={comparisonFull && !comparisonSelected} onChange={() => onToggleComparison(vehicle.id)} />{comparisonSelected ? '비교 목록에 담았어요' : '비교 목록에 담기'}</label><Link className="candidate-compare-link" to="/vehicles/compare" state={state}>차량 비교하기</Link></div>}
      <h2>{vehicle.model}</h2><p>{vehicle.year && `${vehicle.year}년형 · `}{vehicle.trim}</p>

      {candidate.seatingVerificationRequired && <p className="financial-candidate-alert">희망 인원 탑승 가능 여부를 확인해 주세요.</p>}
      {candidate.lengthVerificationRequired && <p className="financial-candidate-alert">차량 크기 확인이 필요한 후보입니다.</p>}
      <dl className="financial-recommendation-specs" aria-label={`${vehicle.model} 비용 정보`}>
        {[['차량 가격', vehicle.price], ...(cost.monthly_payment ? [[`월 할부금 (${cost.financing_months}개월)`, cost.monthly_payment]] : []), ['예상 월 유지비', cost.monthly_running_cost]].map(([label, value]) => <div key={label}><dt><ExplainTerm term={label} context={`추천 차량 ${vehicle.brand} ${vehicle.model}의 비용 항목`} /></dt><dd>{candidateMoney(value)}</dd></div>)}
      </dl>
      </div></div>
      <button type="button" className="recommendation-detail-button" onClick={() => navigate(`/financial/recommendations/details?index=${rank - 1}`, { state })}>추천 근거·차량 상세 보기</button>
    </div>
  </li>;
}
