import VehicleFavoritesPanel from '../../features/vehicle/components/VehicleFavoritesPanel.jsx';
import { dreamCarStorageKey } from '../../features/dream-car/dreamCarStorage.js';
// 마이페이지 (/mypage) — 6단계: 요약 + 바로가기. 자세한 내용은 각 기능 화면에서 본다
// 카드마다 따로 불러오고(불러오는 중 · 실패 · 비어 있음), 한 카드가 실패해도 나머지는 보인다
// 개인정보 수정 · 비밀번호 · 탈퇴 등 계정 관리는 /mypage/profile (ProfilePage) 로 옮겼다
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../../features/auth/authApi';
import Modal from '../../shared/ui/Modal.jsx';
import { getDiagnosisDetail, getMe, getRecentDiagnoses } from '../../features/auth/memberApi';
import { isAdminRole, ROLE_LABELS } from '../../features/auth/roles';
import { getCurrentTaste, getTasteCatalog } from '../../features/taste-test/tasteApi';
import { savedTasteAnswers } from '../../features/taste-test/serverTasteFlow';
import { writeMemberTasteDraft } from '../../features/taste-test/tasteDraftStorage';
import useAuthStore from '../../stores/useAuthStore';
import { useVehicle } from '../../features/vehicle/useVehicle';
import { calculatePurchasePlan } from '../../features/dream-car/purchasePlan';
import {
  calculateSavingsProgress, currentMonth, formatMoney, isProgressPlan, planStorageKey, progressStorageKey,
} from '../../features/dream-car/savingsProgress';
import { CardError, CardLoading } from './CardStatus';
import { deviceName, drivingTag, formatDate, formatDateTime, genderLabel, purchaseTag } from './profileOptions';
import './MyPage.css';
import '../../shared/ui/PageFadeIn.css'; // 11-05: 화면 들어올 때 페이드인

// 서버의 role 값 → 화면에 보여 줄 이름 (7단계 공용 이름표: 일반 회원 · 관리자 · 총관리자)

// 원 단위 금액 → "62만 원" (마이너스면 "-12만 원")
const formatManwon = (won) => `${Math.round(won / 10000).toLocaleString('ko-KR')}만 원`;

// 카드 하나의 불러오기 상태를 다루는 작은 도우미: { status: 'loading' | 'done' | 'error', data, reload }
function useCardData(load) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [key, setKey] = useState(0);
  useEffect(() => {
    let ignore = false; // 응답 전에 화면을 떠나면 결과를 버린다
    load()
      .then((data) => !ignore && setState({ status: 'done', data }))
      .catch(() => !ignore && setState({ status: 'error', data: null }));
    return () => {
      ignore = true;
    };
  }, [load, key]);
  const reload = useCallback(() => {
    setState({ status: 'loading', data: null });
    setKey((value) => value + 1);
  }, []);
  return { ...state, reload };
}

// 카드별 불러오기 함수 (컴포넌트 밖에 두어 매번 새로 만들어지지 않게)
const loadProfile = async () => {
  const [me, sessions] = await Promise.all([getMe(), getSessions().catch(() => [])]); // 기기 정보는 없어도 카드는 보인다
  return { me, current: sessions.find((session) => session.current) ?? null };
};

const loadTaste = async () => {
  const current = await getCurrentTaste();
  if (!current) return null; // 아직 테스트 안 함 (204)
  const catalog = await getTasteCatalog();
  // savedAnswers: 저장된 답을 취향 테스트 화면이 쓰는 모양(질문별 선택 번호)으로 — 이전 버전 취향이면 null
  return { type: catalog.types[current.primary], savedAt: current.savedAt,
    version: catalog.version, questionCount: catalog.questionCount, savedAnswers: savedTasteAnswers(catalog, current) };
};

// 취향 상자를 누를 때: 취향 테스트 화면은 이 탭의 임시 기록을 먼저 보여 주므로,
// 저장된 취향을 "결과" 단계로 임시 기록에 넣어 두고 이동한다 → 들어가자마자 저장된 결과가 보인다
// (원준님 화면 파일은 그대로, 그 기능이 내보내는 함수만 사용)
function openSavedTaste(memberId, data) {
  if (!memberId || !data.savedAnswers) return; // 이전 버전 취향이면 그냥 테스트 첫 화면으로
  writeMemberTasteDraft(memberId, data.version,
    { phase: 'result', step: data.questionCount - 1, answers: data.savedAnswers });
}

// [취향 바꾸기 (테스트 다시 하기)]: 같은 이유로 임시 기록을 "첫 질문 · 답 없음" 으로 바꿔 두고 이동한다
// → 결과 화면이 아니라 1번 질문부터 시작
function startNewTaste(memberId, data) {
  if (!memberId) return;
  writeMemberTasteDraft(memberId, data.version,
    { phase: 'question', step: 0, answers: Array(data.questionCount).fill(null) });
}

// 재무 진단 기록 최대 20건 (재무 진단 결과 화면에서 저장한 기록, 최신 순, 서버 최대 20). 없으면 []
const loadDiagnoses = () => getRecentDiagnoses(20);

export default function MyPage() {
  const profile = useCardData(loadProfile);
  const taste = useCardData(loadTaste);
  const diagnoses = useCardData(loadDiagnoses);

  return (
    <div className="my-page page-fade-in">
      <header className="my-heading">
        <div>
          <div className="my-title-row"><h1>마이페이지</h1></div>
          <p>재무 진단 결과와 관심차량, 구매계획을 한곳에서 확인하세요.</p>
        </div>
      </header>

      <div className="my-row-top">
        <ProfileCard state={profile} />

        <DiagnosisCard state={diagnoses} />
      </div>

      <div className="my-row-three">
        <VehicleFavoritesPanel className="my-card my-card-fill" actions={<>
          <Link className="my-outline-button my-cta" to="/search">차량 찾기</Link>
          <Link className="my-outline-button my-soft-button" to="/vehicles/compare">차량 비교</Link>
        </>} />

        <PlanCard />

        <TasteCard state={taste} />
      </div>
    </div>
  );
}

// 프로필 카드 — 내 정보(GET /members/me) + 지금 기기(GET /auth/sessions)
function ProfileCard({ state }) {
  if (state.status !== 'done') {
    return (
      <section className="my-card my-profile" aria-label="내 정보">
        {state.status === 'loading' ? <CardLoading label="내 정보를 불러오는 중…" />
          : <CardError message="내 정보를 불러오지 못했습니다." onRetry={state.reload} />}
      </section>
    );
  }
  const { me, current } = state.data;
  const tags = [drivingTag(me.drivingExperience), purchaseTag(me.purchaseTiming)].filter(Boolean);
  const missing = !me.birthDate || !me.gender; // 구글로 가입했거나 보완 5 이전 회원

  return (
    <section className="my-card my-profile" aria-labelledby="my-profile-name">
      <div className="my-profile-row">
        <div className="my-avatar" aria-hidden="true">{me.nickName.charAt(0)}</div>
        <div className="my-identity">
          <h2 id="my-profile-name">{me.nickName}님</h2>
          <p>{me.email}</p>
        </div>
      </div>
      <div className="my-profile-badges">
        <span className="my-role-badge my-badge-small">{ROLE_LABELS[me.role] ?? me.role}</span>
        <span className="my-login-badge">{me.socialOnly ? 'G 구글 계정' : '이메일 계정'}</span>
        {tags.map((tag) => <span className="my-tag-badge" key={tag}>{tag}</span>)}
      </div>
      <dl className="my-profile-meta">
        <dt>생년월일</dt><dd className={me.birthDate ? undefined : 'is-empty'}>{formatDate(me.birthDate) ?? '입력 전'}</dd>
        <dt>성별</dt><dd className={me.gender ? undefined : 'is-empty'}>{genderLabel(me.gender) ?? '입력 전'}</dd>
        <dt>전화번호</dt><dd className={me.phoneMasked ? undefined : 'is-none'}>{me.phoneMasked ?? '없음'}</dd>
        {current && (<><dt>최근 로그인</dt><dd>{formatDateTime(current.loggedInAt)} · {deviceName(current.device)}</dd></>)}
      </dl>
      {missing && (
        <p className="my-profile-alert">
          <strong>생년월일 · 성별을 입력해 주세요</strong>
          연령대별 차량 추천과 통계에 쓰입니다.
        </p>
      )}
      <div className="my-profile-actions">
        <Link className="my-outline-button" to="/mypage/profile">개인정보 · 계정 관리</Link>
        {/* 8단계: 1:1 상담 — 관리자는 관리자 대시보드의 [1:1 상담] 탭에서 답한다 */}
        {!isAdminRole(me.role) && <Link className="my-outline-button my-soft-button" to="/mypage/consultation">1:1 상담</Link>}
        {/* 7단계: 관리자 · 총관리자는 일반 로그인 후 여기서도 관리자 대시보드로 */}
        {isAdminRole(me.role) && <Link className="my-outline-button my-soft-button" to="/console">관리자 대시보드</Link>}
      </div>
    </section>
  );
}

// 재무 진단 기록 — 재무 진단 결과 화면에서 저장한 기록 (GET /members/me/diagnoses). 맨 위 = 가장 최근
// 기록 줄을 누르면 위 4칸이 그 진단으로 바뀐다 (처음엔 가장 최근 진단)
function DiagnosisCard({ state }) {
  const records = state.status === 'done' ? state.data : [];
  const [selectedId, setSelectedId] = useState(null);
  const [detailId, setDetailId] = useState(null); // [자세히 보기] 팝업으로 연 진단 번호 (null = 닫힘)
  // 고른 기록이 없거나 목록에서 사라졌으면 가장 최근 진단을 보여 준다
  const shown = records.find((record) => record.analysisId === selectedId) ?? records[0];

  return (
    <section className="my-card my-insight-card" aria-labelledby="my-diagnosis-title">
      <div className="my-insight-head">
        <div>
          <h2 id="my-diagnosis-title">재무 진단</h2>
          <p>{shown ? `${formatDate(shown.completedAt?.slice(0, 10))} 진단${shown === records[0] ? ' · 가장 최근' : ''}` : '재무 진단을 마치면 결과가 여기에 저장돼요'}</p>
        </div>
      </div>
      {state.status === 'loading' && <CardLoading />}
      {state.status === 'error' && <CardError message="재무 진단 기록을 불러오지 못했어요." onRetry={state.reload} />}
      {state.status === 'done' && !shown && <p className="my-empty">아직 저장된 재무 진단이 없어요.</p>}
      {shown && (
        <>
          <div className="my-finance-grid">
            <div><span>월 실수령액</span><strong>{formatManwon(shown.monthlyIncome)}</strong></div>
            <div>
              <span>구매 전 월 여유금</span>
              <strong className={shown.monthlyAvailable > 0 ? 'is-good' : undefined}>{formatManwon(shown.monthlyAvailable)}</strong>
            </div>
            <div><span>사용 가능 예금</span><strong>{formatManwon(shown.purchaseFunds)}</strong></div>
            <div><span>구매 가격 상한</span><strong>{shown.priceUpper != null ? formatManwon(shown.priceUpper) : '산정 정보 없음'}</strong></div>
          </div>
          {/* 진단 기록 전체 (최대 20건), 2줄을 넘으면 목록 안에서 스크롤 — 높이는 MyPage.css .my-mini-history */}
          {records.length > 1 && (
            <ul className="my-mini-history" aria-label="재무 진단 기록">
              {records.map((record) => (
                <li key={record.analysisId}>
                  <button type="button" className={record === shown ? 'is-selected' : undefined}
                    aria-pressed={record === shown} onClick={() => setSelectedId(record.analysisId)}>
                    <strong>{formatDateTime(record.completedAt)} 진단</strong>
                    <span>월 여유금 {formatManwon(record.monthlyAvailable)} · 가격 상한 {record.priceUpper != null ? formatManwon(record.priceUpper) : '없음'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div className="my-insight-actions">
        <Link className="my-plan-button my-inline-button my-cta" to="/financial">{shown ? '새로 진단하기' : '재무 진단 하기'}</Link>
        {shown && (
          <button type="button" className="my-outline-button my-soft-button" onClick={() => setDetailId(shown.analysisId)}>
            자세히 보기
          </button>
        )}
      </div>
      {detailId && <DiagnosisDetailModal analysisId={detailId} onClose={() => setDetailId(null)} />}
    </section>
  );
}

// 구매계획 — 드림카 플래너(형철님 기능)가 이 브라우저에 저장한 계획을 읽기만 한다 (11-04)
// 1) 저축을 시작했으면 저축 기록(dream-car-progress-v1)의 마지막 계획: 모은 금액 · 진행률
// 2) 계획만 저장했으면 구매 계획(dream-car-plan-v3): 차량 · 목표 금액 · 월 저축
// 계산은 플래너가 내보내는 함수를 그대로 써서 플래너 화면과 같은 숫자가 나온다. 회원별 DB 저장이 생기면 그쪽으로 바꾼다
function readPlan(catalog) {
  try {
    const plans = JSON.parse(localStorage.getItem(dreamCarStorageKey(progressStorageKey)) || '[]');
    if (!Array.isArray(plans) || !plans.every(isProgressPlan)) throw new Error('Invalid savings records');
    const active = plans.at(-1);
    if (active) {
      return { kind: 'progress', name: active.name, trim: active.trim, target: active.target,
        ...calculateSavingsProgress(active, currentMonth()) };
    }
    const saved = JSON.parse(localStorage.getItem(dreamCarStorageKey(planStorageKey)));
    const vehicle = catalog.find((car) => car.id === saved?.vehicleId);
    const result = vehicle && saved?.inputs && calculatePurchasePlan(vehicle.price / 10000, saved.inputs);
    if (result) {
      return { kind: 'plan', name: `${vehicle.brand} ${vehicle.model}`, trim: vehicle.trim, target: result.target,
        monthlySaving: saved.inputs.monthlySaving, targetMonths: saved.inputs.targetMonths };
    }
    if (saved) throw new Error('Invalid purchase plan');
  } catch { return { error: '저장된 구매계획을 읽지 못했습니다. 브라우저 저장 공간과 데이터 형식을 확인해 주세요.' }; }
  return null;
}

function PlanCard() {
  // 구매 계획의 차량 정보는 차량 목록에서 찾는다 (조원 VehicleContext, 읽기만)
  const { planningVehicles = [] } = useVehicle();
  const [planSnapshot, setPlanSnapshot] = useState(null);
  const plan = planSnapshot?.catalog === planningVehicles ? planSnapshot.plan : readPlan(planningVehicles);

  return (
    <section className="my-plan my-card-fill" aria-labelledby="my-plan-title">
      <div className="my-insight-head">
        <div>
          <h2 id="my-plan-title">구매계획</h2>
          <p>드림카 플래너에서 이 브라우저에 저장한 계획</p>
        </div>
      </div>
      {plan?.error && <p role="alert">{plan.error} <button type="button" onClick={() => setPlanSnapshot({ catalog: planningVehicles, plan: readPlan(planningVehicles) })}>다시 확인</button></p>}
      {!plan && (
        <>
          <p className="my-empty">아직 저장한 구매계획이 없어요. 드림카 플래너에서 차량과 저축 계획을 세워 보세요.</p>
          <Link className="my-plan-button my-inline-button my-cta" to="/dream-car">드림카 플래너 가기</Link>
        </>
      )}
      {plan && !plan.error && (
        <>
          {/* 차량 아래 한 줄에 트림 · 목표 달성 월 (줄을 따로 두면 카드 높이가 늘어나서) */}
          <div className="my-plan-car">
            <strong>{plan.name}</strong>
            <span>{[plan.trim, plan.targetMonth && `${plan.targetMonth.replace('-', '.')} 목표`].filter(Boolean).join(' · ')}</span>
          </div>
          {plan.kind === 'progress' ? (
            <>
              <div>
                <div className="my-plan-progress-labels">
                  <span>모은 금액 {formatMoney(plan.total)}</span>
                  <strong>{Math.floor(plan.progress)}%</strong>
                </div>
                <div className="my-plan-track" role="progressbar" aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={Math.floor(plan.progress)} aria-label="목표 금액 대비 모은 금액">
                  <span style={{ width: `${plan.progress}%` }} />
                </div>
              </div>
              <div className="my-plan-summary">
                <div><span>목표 금액</span><strong>{formatMoney(plan.target)}</strong></div>
                <div><span>남은 금액</span><strong>{formatMoney(plan.remaining)}</strong></div>
              </div>
              <Link className="my-plan-button my-inline-button" to="/dream-car/progress">저축 기록 보기</Link>
            </>
          ) : (
            <>
              <div className="my-plan-summary">
                <div><span>목표 금액</span><strong>{formatMoney(plan.target)}</strong></div>
                <div><span>월 저축</span><strong>{formatMoney(plan.monthlySaving)} · {plan.targetMonths}개월</strong></div>
              </div>
              <p className="my-empty">아직 저축 기록을 시작하지 않았어요.</p>
              <Link className="my-plan-button my-inline-button" to="/dream-car">드림카 플래너에서 보기</Link>
            </>
          )}
        </>
      )}
    </section>
  );
}

// 재무 진단 한 건 자세히 (팝업) — GET /members/me/diagnoses/{analysisId}
// 11-04 부터 저장한 진단은 기타 소득 · 생활지출 · 대출까지, 그 전 기록은 요약만 있다 (otherIncome === null)
function DiagnosisDetailModal({ analysisId, onClose }) {
  const loadDetail = useCallback(() => getDiagnosisDetail(analysisId), [analysisId]);
  const state = useCardData(loadDetail);
  const detail = state.status === 'done' ? state.data : null;
  const isOld = detail && detail.otherIncome == null;
  const loanTotal = detail?.loans?.reduce((sum, loan) => sum + loan.payment, 0) ?? 0;

  return (
    <Modal title="재무 진단 자세히" subtitle={detail ? `${formatDateTime(detail.completedAt)} 진단` : undefined} onClose={onClose}>
      {state.status === 'loading' && <CardLoading label="진단 기록을 불러오는 중…" />}
      {state.status === 'error' && <CardError message="진단 기록을 불러오지 못했어요." onRetry={state.reload} />}
      {detail && (
        <>
          <dl className="my-detail-list">
            <div><dt>월 실수령액</dt><dd>{formatManwon(detail.monthlyIncome)}</dd></div>
            {!isOld && <div className="is-sub"><dt>그중 기타 소득</dt><dd>{formatManwon(detail.otherIncome)}</dd></div>}
            <div><dt>월 생활지출</dt><dd>{detail.monthlyExpense != null ? formatManwon(detail.monthlyExpense) : '기록 없음'}</dd></div>
            {!isOld && <div><dt>대출 월 상환</dt><dd>{formatManwon(loanTotal)}</dd></div>}
            <div className="is-total"><dt>구매 전 월 여유금</dt><dd>{formatManwon(detail.monthlyAvailable)}</dd></div>
            <div><dt>사용 가능 예금</dt><dd>{formatManwon(detail.purchaseFunds)}</dd></div>
            <div><dt>구매 가격 상한</dt><dd>{detail.priceUpper != null ? formatManwon(detail.priceUpper) : '산정 정보 없음'}</dd></div>
          </dl>
          {!isOld && (
            <>
              <h3 className="my-detail-title">기존 대출</h3>
              {detail.loans.length === 0 ? <p className="my-empty">입력한 대출이 없어요.</p> : (
                <ul className="my-detail-loans">
                  {detail.loans.map((loan, index) => (
                    <li key={index}>
                      <strong>{loan.type ?? '대출'}</strong>
                      <span>월 {formatManwon(loan.payment)}{loan.balance != null ? ` · 잔액 ${formatManwon(loan.balance)}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {isOld && <p className="my-empty">이 진단은 요약만 저장된 예전 기록이라 기타 소득 · 대출 내역이 없어요.</p>}
          <p className="my-empty">추천받은 차량은 저장하지 않아요. 다시 보려면 새로 진단해 주세요.</p>
        </>
      )}
    </Modal>
  );
}

// 내 취향 — 차량 취향 테스트 결과 (조원 기능, GET /members/me/current-taste)
function TasteCard({ state }) {
  const memberId = useAuthStore((store) => store.member?.id);

  return (
    <section className="my-card my-card-fill" aria-labelledby="my-taste-title">
      <div className="my-insight-head">
        <div>
          <h2 id="my-taste-title">내 취향</h2>
          <p>차량 취향 테스트 결과{state.status === 'done' && state.data ? ` · ${formatDate(state.data.savedAt?.slice(0, 10))} 저장` : ''}</p>
        </div>
      </div>
      {state.status === 'loading' && <CardLoading />}
      {state.status === 'error' && <CardError message="취향 결과를 불러오지 못했어요." onRetry={state.reload} />}
      {state.status === 'done' && !state.data && (
        <>
          <p className="my-empty">아직 취향 테스트를 하지 않았어요. 8가지 질문으로 내 차량 취향을 알아보세요.</p>
          <Link className="my-plan-button my-inline-button my-cta" to="/taste-test">취향 테스트 하기</Link>
        </>
      )}
      {state.status === 'done' && state.data && (
        <>
          {/* 11-04: 누르면 저장된 취향의 자세한 결과 화면으로 (openSavedTaste 참고) */}
          <Link className="my-taste-type" to="/taste-test" onClick={() => openSavedTaste(memberId, state.data)}>
            <span>저장된 취향 · 자세히 보기 →</span>
            <strong>{state.data.type?.name ?? '알 수 없는 유형'}</strong>
            {state.data.type?.description && <p>{state.data.type.description}</p>}
          </Link>
          <p className="my-taste-how">
            취향이 바뀌었다면 테스트를 다시 해 보세요. 새 결과를 저장하면 여기 내 취향도 바뀌어요.
          </p>
          <Link className="my-outline-button" to="/taste-test" onClick={() => startNewTaste(memberId, state.data)}>취향 바꾸기 (테스트 다시 하기)</Link>
        </>
      )}
    </section>
  );
}
