import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChartNoAxesCombined, Wallet, CarFront } from 'lucide-react';
import theme from '../../styles/theme';
import vehiclePhoto from '../../assets/vehicles/vehicle-0.webp';
import useScrollReveal from './useScrollReveal';
import useSectionStage from './useSectionStage';
import './AboutPreviewPage.css';
import './AboutPreviewSections.css';

const journey = [
  { number: '01', Icon: Wallet, title: '자동차에 쓸 수 있는 예산', text: '소득과 지출, 자산과 부채를 정리해 자동차에 쓸 수 있는 여력을 확인합니다.' },
  { number: '02', Icon: CarFront, title: '예산과 선호에 맞는 차량', text: '구매 여력과 필요한 인원, 차체와 연료 선호를 함께 살펴 후보를 비교합니다.' },
  { number: '03', Icon: ChartNoAxesCombined, title: '목표 차량을 위한 저축 계획', text: '구매 조건과 유지 비용을 살펴보고, 목표 차량을 위한 저축 계획으로 이어갑니다.' },
];

function DiagnosisExample() {
  const [income, setIncome] = useState(350);
  const [expenses, setExpenses] = useState(190);
  const available = income - expenses - 85;
  return <figure className="about-preview-report">
    <figcaption><span>내 예산, 이렇게 살펴봅니다</span><span className="about-preview-sample">직접 바꿔보세요</span></figcaption>
    <label className="about-preview-slider"><span>월 소득 <strong>{income}만 원</strong></span><input type="range" min="200" max="700" step="10" value={income} onChange={event => setIncome(Number(event.target.value))} aria-valuetext={`${income}만 원`} /></label>
    <label className="about-preview-slider"><span>월 생활비·기존 지출 <strong>{expenses}만 원</strong></span><input type="range" min="100" max="400" step="10" value={expenses} onChange={event => setExpenses(Number(event.target.value))} aria-valuetext={`${expenses}만 원`} /></label>
    <dl className="about-preview-breakdown">
      <div><dt><i className="about-preview-dot-saving" />저축과 남겨둘 여유 · 고정 예시</dt><dd>85만 원</dd></div>
    </dl>
    <div className="about-preview-live-result" aria-live="polite" aria-atomic="true"><span>지출과 저축을 제외한 월 여력</span><strong>{available} <small>만 원</small></strong><p>{available > 0 ? '이 여력 안에서 차량 구매·유지 비용을 함께 살펴보세요.' : '예시에서는 여유 자금이 부족해요. 지출과 저축 계획부터 살펴보세요.'}</p></div>
    <p className="about-preview-disclaimer">단순 계산 예시입니다. 실제 진단은 자산·부채 등을 추가로 반영합니다. 위 금액은 권장 차량 예산이 아닙니다.</p>
  </figure>;
}

export default function AboutPreviewPage() {
  const containerRef = useScrollReveal();
  const { activeSection, stageEnabled, setActiveSection } = useSectionStage(containerRef);
  const sectionNames = ['서비스 소개', '예산 계산', '주요 기능', '드림카 플래너'];
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

    <section id="about-preview-budget" data-reveal className="about-preview-container about-preview-budget-section" aria-labelledby="about-preview-budget-title"><div><p className="about-preview-kicker">예산을 먼저 확인해 보세요</p><h2 id="about-preview-budget-title">월급에서 지출을 빼면,<br />차에 쓸 여유는 얼마일까요?</h2><p>오른쪽 예시의 소득과 지출을 바꿔보세요.<br />실제 진단에서는 자산과 부채까지 함께 살펴봅니다.</p><Link className="about-preview-text-link" to="/financial">내 정보로 자세히 진단하기 <ArrowRight size={theme.iconSize.sm} aria-hidden="true" /></Link></div><DiagnosisExample /></section>

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
