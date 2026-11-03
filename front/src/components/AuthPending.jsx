import './AuthPending.css';

// 새로고침 직후 로그인 복원(refresh token) 결과를 기다리는 동안 RequireAuth · GuestOnly 가 보여 주는 화면.
// 복원은 보통 금방 끝나므로, 짧게 끝날 때 깜빡이지 않도록 CSS 로 잠깐 늦게 나타나게 한다.
// 스피너 아래에 작은 안내 문구를 함께 두고, role="status" 로 화면 읽기 프로그램에도 알린다.
export default function AuthPending() {
  return (
    <div className="auth-pending" role="status">
      <span className="auth-pending-spinner" aria-hidden="true" />
      <span className="auth-pending-label">로그인 상태를 확인하는 중입니다…</span>
    </div>
  );
}
