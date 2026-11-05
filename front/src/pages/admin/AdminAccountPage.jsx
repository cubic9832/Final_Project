import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import theme from '../../styles/theme';
import GlobalToast from '../../components/GlobalToast';
import { logout } from '../../features/auth/authApi';
import LogoutConfirmModal from '../../features/auth/components/LogoutConfirmModal';
import { ROLE_LABELS } from '../../features/auth/roles';
import useAuthStore from '../../stores/useAuthStore';
import { showToast } from '../../stores/useToastStore';
import ProfilePage from '../mypage/ProfilePage';
import './AdminPage.css';

// 11-05: /console/account — 관리자 · 총관리자의 개인정보 · 계정 관리 (닉네임 · 비밀번호 · 로그인 기기)
// 관리자 화면 규칙(보완 11 · 12)대로 공통 헤더 없이, 위쪽 줄은 관리자 대시보드(AdminPage)와 같은 클래스로 같은 모양
// (대시보드 UI 는 조장님이 통일하므로 AdminPage 는 건드리지 않고 클래스만 같이 쓴다). 버튼만 [내 계정] 대신 [관리자 대시보드]
export default function AdminAccountPage() {
  const navigate = useNavigate();
  const member = useAuthStore((state) => state.member);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false); // 로그아웃 확인 팝업 (대시보드와 같은 팝업)

  // 대시보드의 로그아웃과 같은 흐름: 서버 로그아웃(refresh token 삭제) → 메인으로 → 알림
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
        <Link className="admin-outline-button" to="/console"><LayoutDashboard size={theme.iconSize.sm} aria-hidden="true" />관리자 대시보드</Link>
        <button className="admin-outline-button" type="button" onClick={() => setIsLogoutOpen(true)}><LogOut size={theme.iconSize.sm} aria-hidden="true" />로그아웃</button>
      </div>
    </div>
    {/* 회원과 같은 계정 관리 화면 — inConsole 이면 관리자 모드로 여기서 그린다 */}
    <ProfilePage inConsole />
    {isLogoutOpen && <LogoutConfirmModal onConfirm={handleLogout} onClose={() => setIsLogoutOpen(false)} />}
    {/* 공통 Layout 밖이라 알림 표시 자리를 여기 둔다 (닉네임 저장 · 비밀번호 변경 알림 등) */}
    <GlobalToast />
  </div>;
}
