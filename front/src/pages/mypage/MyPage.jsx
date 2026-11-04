// 마이페이지 (/mypage) — 6단계: 요약 + 바로가기. 자세한 내용은 각 기능 화면에서 본다
// 카드마다 따로 불러오고(불러오는 중 · 실패 · 비어 있음), 한 카드가 실패해도 나머지는 보인다
// 개인정보 수정 · 비밀번호 · 탈퇴 등 계정 관리는 /mypage/profile (ProfilePage) 로 옮겼다
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSessions } from '../../features/auth/authApi';
import { getMe, getRecentDiagnoses } from '../../features/auth/memberApi';
import { isAdminRole, ROLE_LABELS } from '../../features/auth/roles';
import { getCurrentTaste, getTasteCatalog } from '../../features/taste-test/tasteApi';
import { savedTasteAnswers } from '../../features/taste-test/serverTasteFlow';
import { writeMemberTasteDraft } from '../../features/taste-test/tasteDraftStorage';
import useAuthStore from '../../stores/useAuthStore';
import { getVehicles } from '../../features/vehicle/vehicleApi';
import { useVehicle } from '../../features/vehicle/useVehicle';
import { CardError, CardLoading } from './CardStatus';
import { deviceName, drivingTag, formatDate, formatDateTime, genderLabel, purchaseTag } from './profileOptions';
import './MyPage.css';

// 서버의 role 값 → 화면에 보여 줄 이름 (7단계 공용 이름표: 일반 회원 · 관리자 · 총관리자)

// 차량 화면(조원 VehicleContext)이 관심차량을 저장하는 브라우저 저장소 키 — 회원별 DB 저장은 아직 없음
const FAVORITES_KEY = 'vehicle-favorites';

// 원 단위 금액 → "62만 원" (마이너스면 "-12만 원")
const formatManwon = (won) => `${Math.round(won / 10000).toLocaleString('ko-KR')}만 원`;

function readFavoriteIds() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return []; // 저장소를 쓸 수 없는 환경이면 없는 것으로
  }
}

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

// 최근 재무 진단 3건 (재무 진단 결과 화면에서 저장한 기록, 최신 순). 없으면 []
const loadDiagnoses = () => getRecentDiagnoses(3);

const loadFavorites = async () => {
  const ids = readFavoriteIds();
  if (!ids.length) return [];
  const vehicles = await getVehicles();
  return ids.map((id) => vehicles.find((vehicle) => vehicle.id === id)).filter(Boolean);
};

export default function MyPage() {
  const profile = useCardData(loadProfile);
  const taste = useCardData(loadTaste);
  const favorites = useCardData(loadFavorites);
  const diagnoses = useCardData(loadDiagnoses);

  return (
    <div className="my-page">
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
        <FavoritesCard state={favorites} />

        {/* 구매계획: 저장 기능이 아직 없어 계획 전(빈 상태)으로 보여 준다 — 기능이 생기면 저장한 계획으로 */}
        {/* 제목 줄은 관심차량 · 내 취향 카드와 같은 모양 (my-insight-head) */}
        <section className="my-plan my-card-fill" aria-labelledby="my-plan-title">
          <div className="my-insight-head">
            <div>
              <h2 id="my-plan-title">구매계획</h2>
              <p>드림카 플래너에서 저장한 계획</p>
            </div>
          </div>
          <p className="my-empty">아직 저장한 구매계획이 없어요. 재무 진단으로 구매 여력과 추천 차량을 먼저 확인해 보세요.</p>
          <Link className="my-plan-button my-inline-button" to="/financial">재무 진단 하러 가기</Link>
        </section>

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

// 관심차량 — 차량 화면에서 [관심차량 저장] 한 차량 (이 브라우저에 저장된 목록, 조원 기능)
function FavoritesCard({ state }) {
  // 비교 화면에 담긴 차 수 (조원 VehicleContext, 읽기만) — 차량 상세의 "비교에 추가 (n/3)" 와 같은 표기
  const { comparison } = useVehicle();

  return (
    <section className="my-card my-card-fill" aria-labelledby="my-favorites-title">
      <div className="my-insight-head">
        <div>
          <h2 id="my-favorites-title">관심차량</h2>
          <p>이 브라우저에 저장한 차량</p>
        </div>
      </div>
      {state.status === 'loading' && <CardLoading />}
      {state.status === 'error' && <CardError message="관심차량을 불러오지 못했습니다." onRetry={state.reload} />}
      {state.status === 'done' && state.data.length === 0 && (
        <>
          <p className="my-empty">아직 저장한 관심차량이 없어요. 차량 상세에서 [관심차량 저장]을 눌러 보세요.</p>
        </>
      )}
      {state.status === 'done' && state.data.length > 0 && (
        <>
          {/* 저장한 차를 모두 보여 주고, 4대부터는 목록 안에서 스크롤 (높이는 MyPage.css .my-fav-list) */}
          <ul className="my-fav-list">
            {state.data.map((vehicle) => (
              <li key={vehicle.id}>
                <Link className="my-fav-line" to={`/vehicles/${vehicle.id}`}>
                  <strong>{vehicle.name}</strong>
                  <span>상세 보기 →</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {/* 관심차량이 있든 없든 같은 두 버튼 (비교 화면은 관심차량 없이도 차를 골라 비교할 수 있다).
          주 버튼(남색)은 늘 [차량 찾기] — 관심차량을 모으는 출발점이라 */}
      {state.status === 'done' && (
        <div className="my-fav-actions">
          <Link className="my-outline-button" to="/search">차량 찾기</Link>
          <Link className="my-outline-button my-soft-button" to="/vehicles/compare">비교하기 ({comparison.length}/3)</Link>
        </div>
      )}
    </section>
  );
}

// 내 취향 — 첫 차 취향 테스트 결과 (조원 기능, GET /members/me/current-taste)
// 최근 재무 진단 — 재무 진단 결과 화면에서 저장한 기록 (GET /members/me/diagnoses). 맨 위 = 가장 최근
function DiagnosisCard({ state }) {
  const [latest, ...older] = state.status === 'done' ? state.data : [];
  return (
    <section className="my-card my-insight-card" aria-labelledby="my-diagnosis-title">
      <div className="my-insight-head">
        <div>
          <h2 id="my-diagnosis-title">최근 재무 진단</h2>
          <p>{latest ? `${formatDate(latest.completedAt?.slice(0, 10))} 진단` : '재무 진단을 마치면 결과가 여기에 저장돼요'}</p>
        </div>
      </div>
      {state.status === 'loading' && <CardLoading />}
      {state.status === 'error' && <CardError message="재무 진단 기록을 불러오지 못했어요." onRetry={state.reload} />}
      {state.status === 'done' && !latest && <p className="my-empty">아직 저장된 재무 진단이 없어요.</p>}
      {latest && (
        <>
          <div className="my-finance-grid">
            <div><span>월 실수령액</span><strong>{formatManwon(latest.monthlyIncome)}</strong></div>
            <div>
              <span>구매 전 월 여유금</span>
              <strong className={latest.monthlyAvailable > 0 ? 'is-good' : undefined}>{formatManwon(latest.monthlyAvailable)}</strong>
            </div>
            <div><span>사용 가능 예금</span><strong>{formatManwon(latest.purchaseFunds)}</strong></div>
            <div><span>구매 가격 상한</span><strong>{latest.priceUpper != null ? formatManwon(latest.priceUpper) : '산정 정보 없음'}</strong></div>
          </div>
          {older.length > 0 && (
            <ul className="my-mini-history" aria-label="이전 재무 진단">
              {older.map((record) => (
                <li key={record.analysisId}>
                  <strong>{formatDate(record.completedAt?.slice(0, 10))} 진단</strong>
                  <span>월 여유금 {formatManwon(record.monthlyAvailable)} · 가격 상한 {record.priceUpper != null ? formatManwon(record.priceUpper) : '없음'}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div className="my-insight-actions">
        <Link className="my-plan-button my-inline-button" to="/financial">{latest ? '새로 진단하기' : '재무 진단 하기'}</Link>
      </div>
    </section>
  );
}

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
          <Link className="my-plan-button my-inline-button" to="/taste-test">취향 테스트 하기</Link>
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
