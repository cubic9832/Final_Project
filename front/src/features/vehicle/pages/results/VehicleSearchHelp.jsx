import { useId } from 'react';
import { CircleHelp } from 'lucide-react';
import theme from '../../../../styles/theme';

// 검색창이 글자 포함 일치를 먼저 보고, Elasticsearch 로 브랜드, 차종, 연료 등까지 넓혀 찾는다는 걸 알려 준다
export default function VehicleSearchHelp() {
  const tooltipId = useId();
  return <span className="vehicle-search-help">
    <button type="button" aria-label="차량 검색 방법 안내" aria-describedby={tooltipId}>
      <CircleHelp size={theme.iconSize.lg} aria-hidden="true" />
    </button>
    <span className="vehicle-search-help-tooltip" role="tooltip" id={tooltipId}>
      <strong>검색 방법</strong>
      <span>차명, 트림, 차종에 입력한 글자가 포함된 차량을 우선 검색</span>
      <span>브랜드, 연료(하이브리드, 전기차 등), 신차/중고, 파워트레인도 함께 검색 (예: 현대 하이브리드)</span>
      <span>차명과 브랜드는 앞 글자만 입력해도 검색 (예: 그랜)</span>
      <span>여러 단어 입력 시 모두 일치하는 차량만 표시</span>
    </span>
  </span>;
}
