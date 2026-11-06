import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Car, Cpu, LayoutDashboard, ListChecks, LogOut, MessagesSquare, ScrollText, ShieldCheck, UserRound, Users } from 'lucide-react';
import theme from '../../styles/theme';
import GlobalToast from '../../components/GlobalToast';
import { logout } from '../../features/auth/authApi';
import LogoutConfirmModal from '../../features/auth/components/LogoutConfirmModal';
import { ROLE_LABELS } from '../../features/auth/roles';
import useAuthStore from '../../stores/useAuthStore';
import { showToast } from '../../stores/useToastStore';
import AdminOverviewPanel from './AdminOverviewPanel';
import AdminVehiclesPanel from './AdminVehiclesPanel';
import AdminRecommendationsPanel from './AdminRecommendationsPanel';
import AdminMembersPanel from './AdminMembersPanel';
import AdminModelsPanel from './AdminModelsPanel';
import AdminLogsPanel from './AdminLogsPanel';
import AdminChatPanel from './AdminChatPanel';
import AdminChatbotPanel from './AdminChatbotPanel';
import AdminRolePanel from './permissions/AdminRolePanel.jsx';
import AdminPermissionAccountsPanel from './permissions/AdminPermissionAccountsPanel.jsx';
import { getAdminAccess } from '../../features/admin/adminPermissionApi.js';
import './AdminPage.css';

const sections = [
  { id: 'overview', screen: 'OVERVIEW', label: '운영 현황', icon: LayoutDashboard, description: '데이터와 서비스 상태를 한눈에 살펴보세요.', panel: AdminOverviewPanel },
  { id: 'vehicles', screen: 'VEHICLES', label: '차량 관리', icon: Car, description: '차량을 등록하고 제원·가격·공개 상태를 관리합니다.', panel: AdminVehiclesPanel },
  { id: 'recommendations', screen: 'RECOMMENDATIONS', label: '추천 관리', icon: ListChecks, description: '추천 후보의 가격 출처와 제원 확인 상태를 살펴봅니다.', panel: AdminRecommendationsPanel },
  { id: 'models', screen: 'MODELS', label: '모델 관리', icon: Cpu, description: '적용 중인 모델의 평가 결과와 학습 기록을 확인합니다.', panel: AdminModelsPanel },
  { id: 'members', screen: 'MEMBERS', label: '회원 관리', icon: Users, description: '가입 현황과 회원 상태, 운영 권한을 확인합니다.', panel: AdminMembersPanel },
  // 8단계: 1:1 상담 — 대기 목록은 실시간(WebSocket), 먼저 [맡기] 를 누른 관리자가 답한다
  { id: 'chat', screen: 'CHAT', label: '1:1 상담', icon: MessagesSquare, description: '회원의 상담 요청을 맡아 실시간으로 답합니다.', panel: AdminChatPanel },
  { id: 'chatbot', screen: 'CHATBOT', label: '콤파 대화·평가', icon: MessagesSquare, description: '콤파의 질문·답변과 좋아요·싫어요 평가를 확인합니다.', panel: AdminChatbotPanel },
  { id: 'permissions', superOnly: true, label: '관리자 권한', icon: Users, description: '회원에게 관리자 권한을 부여하거나 기존 권한을 변경·회수합니다.', panel: AdminPermissionAccountsPanel },
  { id: 'roles', superOnly: true, label: '역할·화면 권한', icon: ShieldCheck, description: '업무 역할별로 사용할 화면을 관리합니다.', panel: AdminRolePanel },
  { id: 'logs', screen: 'LOGS', label: '운영 로그', icon: ScrollText, description: '관리자의 주요 작업 이력을 확인합니다.', panel: AdminLogsPanel },
];

// 관리자 대시보드. 7단계: 회원 관리 · 운영 로그 탭, 운영 현황의 회원 · 차량 수 · 서비스 연결 상태 · 최근 이력은 실제 데이터(/api/v1/admin/**)
// 10-27: 화면의 "예시" 표시 · 안내 문구는 지웠다 (사용자 요청). 10-27 오후: 추천 · 모델 탭도 실제 데이터 (추천 서버 학습 결과 · DB)
// 보완 11: 주소는 /console, 공통 헤더 없이 관리자 화면만 — 오른쪽 위에 누가 로그인했는지 · 로그아웃
//          (보완 12: [서비스 홈] 은 지움 — 관리자는 로그인하면 바로 이 화면이고, 서비스 화면에는 돌아올 버튼이 없어서)
//          대시보드 첫 화면은 왼쪽 메뉴의 "운영 현황" (탭 주소 /console?tab=…)
export default function AdminPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const member = useAuthStore((state) => state.member);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false); // 로그아웃 확인 팝업 (헤더와 같은 팝업)
  const [access, setAccess] = useState(null);
  const [accessError, setAccessError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = () => getAdminAccess(controller.signal).then(result => { if (active) { setAccess(result); setAccessError(false); } }).catch(() => { if (active) setAccessError(true); });
    load();
    window.addEventListener('focus', load);
    window.addEventListener('admin-permissions-changed', load);
    return () => { active = false; controller.abort(); window.removeEventListener('focus', load); window.removeEventListener('admin-permissions-changed', load); };
  }, [reload]);
  const visibleSections = access ? sections.filter(item => item.superOnly ? access.superAdmin : access.screens.includes(item.screen)) : [];
  const requested = sections.find(item => item.id === params.get('tab'));
  const section = requested || visibleSections[0];
  const permitted = section && visibleSections.some(item => item.id === section.id);
  const Panel = permitted ? section.panel : null;

  // 헤더의 로그아웃과 같은 흐름: 서버 로그아웃(refresh token 삭제) → 메인으로 → 알림
  async function handleLogout() {
    await logout();
    setIsLogoutOpen(false);
    navigate('/');
    showToast('로그아웃되었습니다.');
  }

  return <div className="admin-page">
    <div className="admin-workspace-heading"><div><h1>관리자 대시보드</h1></div>
      <div className="admin-account-bar">
        <span className="admin-account-name"><strong>{member?.nickName}</strong>{ROLE_LABELS[member?.role]}</span>
        {/* 11-05: 관리자 계정의 닉네임 · 비밀번호 · 로그인 기기 관리 — 회원과 같은 계정 관리 화면(관리자 모드)을 공통 헤더 없이 (AdminAccountPage) */}
        <Link className="admin-outline-button" to="/console/account"><UserRound size={theme.iconSize.sm} aria-hidden="true" />내 계정</Link>
        <button className="admin-outline-button" type="button" onClick={() => setIsLogoutOpen(true)}><LogOut size={theme.iconSize.sm} aria-hidden="true" />로그아웃</button>
      </div>
    </div>
    <div className="admin-workspace">
      <aside className="admin-sidebar"><div className="admin-sidebar-heading"><ShieldCheck size={theme.iconSize.md} aria-hidden="true" /><div><strong>운영 관리</strong><span>CreditComPass</span></div></div>
        <nav className="admin-navigation" aria-label="관리자 메뉴">{visibleSections.map(({ id, label, icon: Icon }) => <Link key={id} to={`/console?tab=${id}`} aria-current={section?.id === id ? 'page' : undefined}><Icon size={theme.iconSize.md} aria-hidden="true" /><span>{label}</span></Link>)}</nav>
      </aside>
      <div className="admin-content">{accessError ? <section className="admin-card" role="alert">권한 정보를 불러오지 못했습니다. <button type="button" className="admin-text-button" onClick={() => setReload(value => value + 1)}>다시 시도</button></section> : !access ? <p role="status">사용 가능한 화면을 확인하고 있습니다.</p> : Panel ? <><header className="admin-heading"><div><h2>{section.label}</h2><p>{section.description}</p></div></header><Panel key={section.id} allowedScreens={access.screens} /></> : <section className="admin-card">{visibleSections.length ? '이 화면을 사용할 권한이 없습니다. 왼쪽 메뉴에서 사용 가능한 화면을 선택해 주세요.' : '배정된 화면 권한이 없습니다. 총관리자에게 문의해 주세요.'}</section>}</div>
    </div>
    {isLogoutOpen && <LogoutConfirmModal onConfirm={handleLogout} onClose={() => setIsLogoutOpen(false)} />}
    {/* 공통 Layout 밖이라 알림 표시 자리를 여기 둔다 (회원 관리의 권한 변경 알림 등) */}
    <GlobalToast />
  </div>;
}
