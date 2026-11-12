import { Link } from 'react-router-dom';
import { ArrowRight, ChartNoAxesCombined, Wallet, CarFront } from 'lucide-react';
import theme from '../../styles/theme';
import vehiclePhoto from '../../assets/vehicles/vehicle-0.webp';
import useScrollReveal from './useScrollReveal';
import useSectionStage from './useSectionStage';
import './AboutPreviewPage.css';
import './AboutPreviewComparison.css';
import './AboutPreviewSections.css';

const journey = [
  { number: '01', Icon: Wallet, title: '자동차에 쓸 수 있는 예산', text: '소득과 지출, 자산과 부채를 정리해 자동차에 쓸 수 있는 여력을 확인합니다.' },
  { number: '02', Icon: CarFront, title: '예산과 선호에 맞는 차량', text: '구매 여력과 필요한 인원, 차체와 연료 선호를 함께 살펴 후보를 비교합니다.' },
  { number: '03', Icon: ChartNoAxesCombined, title: '목표 차량을 위한 저축 계획', text: '구매 조건과 유지 비용을 살펴보고, 목표 차량을 위한 저축 계획으로 이어갑니다.' },
];

const comparisonExamples = [
  { label: '차량 가격', values: ['2,800만 원', '3,200만 원', '3,600만 원'] },
  { label: '월 유지비', values: ['25만 원', '19만 원', '15만 원'] },
  { label: '3년 총비용', values: ['3,700만 원', '3,884만 원', '4,140만 원'] },
];

function VehicleComparisonExample() {
  return <figure className="about-preview-comparison-example">
    <figcaption><strong>한눈에 보는 차량 비교</strong><span>가상 예시 · 3대 비교</span></figcaption>
    <div className="about-preview-comparison-table-wrap"><table>
      <caption className="sr-only">가상 차량 3대의 가격과 유지비 비교</caption>
      <thead><tr><th scope="col">비교 항목</th>{['가솔린 세단', '하이브리드 SUV', '전기 SUV'].map((name, index) => <th scope="col" key={name}><span className="about-preview-comparison-car"><CarFront size={theme.iconSize.lg} aria-hidden="true" /></span><small>후보 0{index + 1}</small><strong>{name}</strong></th>)}</tr></thead>
      <tbody>{comparisonExamples.map(({ label, values }) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody>
    </table></div>
    <div className="about-preview-comparison-note"><ChartNoAxesCombined size={theme.iconSize.md} aria-hidden="true" /><p><strong>차량 가격 다음으로, 유지비까지.</strong><span>같은 기준으로 비교하면 선택이 더 명확해집니다.</span></p></div>
    <p className="about-preview-comparison-disclaimer">이해를 돕기 위한 가상 차량·금액입니다. 3년 총비용은 차량 가격과 월 유지비 36개월의 합이며, 실제 비교 결과는 차량과 구매 조건에 따라 달라집니다.</p>
  </figure>;
}

export default function AboutPreviewPage() {
  const containerRef = useScrollReveal();
  const { activeSection, stageEnabled, setActiveSection } = useSectionStage(containerRef);
  const sectionNames = ['서비스 소개', '차량 비교', '주요 기능', '드림카 플래너'];
  return <div className={`about-preview${stageEnabled ? ' is-stage' : ''}`} data-active-section={activeSection} ref={containerRef}>
    {stageEnabled && <nav className="about-preview-stage-nav" aria-label="소개 섹션"><div>{sectionNames.map((name, index) => <button type="button" key={name} aria-label={`${index + 1}. ${name}`} title={name} aria-current={index === activeSection ? 'step' : undefined} onClick={() => setActiveSection(index)}><span>{String(index + 1).padStart(2, '0')}</span><span className="about-preview-nav-label">{name}</span></button>)}</div><div className="about-preview-stage-controls"><span aria-live="polite">0{activeSection + 1} <span>/ 04</span></span><button type="button" aria-label="이전 섹션" disabled={activeSection === 0} onClick={() => setActiveSection(index => Math.max(0, index - 1))}><ArrowRight className="about-preview-previous-icon" size={theme.iconSize.sm} aria-hidden="true" /></button><button type="button" aria-label="다음 섹션" disabled={activeSection === sectionNames.length - 1} onClick={() => setActiveSection(index => Math.min(sectionNames.length - 1, index + 1))}><ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></button></div></nav>}
    <section id="about-preview-intro" data-reveal className="about-preview-hero about-preview-container" aria-labelledby="about-preview-title">
      <div className="about-preview-hero-copy">
        <p className="about-preview-kicker">재무 진단 기반 자동차 추천</p>
        <h1 id="about-preview-title">내 예산으로 탈 수 있는 차,<br /><span>유지비까지 보고 고르세요.</span></h1>
        <p className="about-preview-lead">소득·지출·자산·부채로 구매 여력을 확인하고,<br />예산과 차량 선호에 맞는 자동차를 추천받으세요.</p>
        <Link className="about-preview-cta" to="/financial">내 예산에 맞는 차 찾기 <ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></Link>
        <a className="about-preview-text-link" href="#about-preview-story">어떤 결과를 확인할 수 있나요?</a>
      </div>
      <figure className="about-preview-vehicle-photo"><img src={vehiclePhoto} alt="밝은 스튜디오에 주차된 흰색 세단의 전면과 측면" fetchPriority="high" /><figcaption><span>가격부터 유지비까지</span><strong>내 생활에 맞는 한 대를 찾는 기준.</strong><Link to="/search">차량 둘러보기 <ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></Link></figcaption></figure>
    </section>

    <section id="about-preview-comparison" data-reveal className="about-preview-container about-preview-comparison-section" aria-labelledby="about-preview-comparison-title">
      <div className="about-preview-comparison-copy"><p className="about-preview-kicker">차량 비교 · 최대 10대를 한눈에</p><h2 id="about-preview-comparison-title">마음에 드는 차들,<br />같은 기준으로 비교하세요.</h2><p>구매 가격부터 월 유지비, 장기 보유 비용까지.<br />후보를 나란히 놓고 내 생활에 맞는 차를 찾아보세요.</p><ul><li>차량 가격과 할부금 비교</li><li>유류비·보험료·세금 등 유지비 확인</li><li>3년 총비용과 구매 후 월 여유 자금 확인</li></ul><Link className="about-preview-cta" to="/vehicles/compare">차량 비교하러 가기 <ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></Link></div>
      <VehicleComparisonExample />
    </section>

    <section data-reveal id="about-preview-story" className="about-preview-container about-preview-journey" aria-labelledby="about-preview-journey-title">
      <div className="about-preview-section-heading"><p className="about-preview-kicker">재무 진단부터 차량 비교, 구매 계획까지</p><h2 id="about-preview-journey-title">자동차를 고를 때 필요한<br />3가지 결과를 확인하세요.</h2><p>재무 진단에서 차량 비교, 구매 계획까지 한 흐름으로.</p></div>
      <ol className="about-preview-journey-list">{journey.map(({ number, Icon, title, text }) => <li key={number}><div className="about-preview-step-top"><span>{number}</span><Icon size={theme.iconSize.lg} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p><div className="about-preview-output-example" aria-label="결과 구성 예시"><span>확인할 수 있는 정보</span>{number === '01' ? <><strong>구매 여력</strong><div><span>소득 · 지출</span><span>자산 · 부채</span></div><small>입력한 재무 정보로 분석</small></> : number === '02' ? <><strong>차량 후보와 추천 이유</strong><div><span>예산 범위</span><span>정원 · 선호</span></div><small>조건에 맞는 후보를 비교</small></> : <><strong>목표 자금과 진행률</strong><div className="about-preview-progress-example"><span /></div><small>저축 기록으로 달성 현황 확인</small></>}</div></li>)}</ol>
      <Link className="about-preview-text-link" to="/search">어떤 차량이 있는지 먼저 둘러보기 <ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></Link>
    </section>

    <section id="about-preview-criteria" data-reveal className="about-preview-dream" aria-labelledby="about-preview-dream-title">
      <div className="about-preview-dream-copy"><p className="about-preview-kicker">드림카 플래너 · 구매 계획과 저축 관리</p><h2 id="about-preview-dream-title">갖고 싶은 차가 있다면,<br />언제 살 수 있을지 계획하세요.</h2><p>목표 차량과 현재 자금, 저축 조건을 정하고<br />구매에 필요한 금액과 준비 기간을 확인하세요.</p><ol><li><strong>차량과 구매 조건 선택</strong><span>차량 가격과 초기 비용, 유지비 예비자금까지 계산</span></li><li><strong>목표 자금과 저축 계획 설정</strong><span>보유 자금과 저축 조건에 따른 구매 계획 확인</span></li><li><strong>실제 저축을 기록하며 관리</strong><span>월별 목표와 실적, 누적 자금과 달성률 비교</span></li></ol><Link className="about-preview-cta" to="/dream-car">드림카 구매 계획 세우기 <ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></Link></div>
      <figure className="about-preview-dream-example"><figcaption>목표 자금 관리 <span>가상 예시</span></figcaption><div className="about-preview-dream-goal"><CarFront size={theme.iconSize.lg} aria-hidden="true" /><div><span>나의 목표 차량</span><strong>구매 목표 자금 3,000만 원</strong></div></div><div className="about-preview-dream-total"><span>현재 모은 금액</span><strong>1,200<small>만 원</small></strong></div><progress value="40" max="100" aria-label="가상 예시 목표 달성률 40퍼센트" /><div className="about-preview-dream-pair"><span>목표 달성률 <strong>40%</strong></span><span>남은 목표 <strong>1,800만 원</strong></span></div><div className="about-preview-dream-record"><span>이번 달 저축 기록</span><strong>50만 원</strong><span>월 목표 50만 원 달성</span></div><p>예시 화면입니다. 실제 목표 금액과 달성 현황은 선택한 차량과 입력한 계획·저축 기록에 따라 달라집니다.</p></figure>
    </section>
    <footer className="about-preview-footer about-preview-container"><strong>CreditComPass</strong><span>내 생활에 맞는 자동차 선택의 기준</span><Link to="/financial">차량 맞춤 추천 시작하기</Link></footer>
  </div>;
}
