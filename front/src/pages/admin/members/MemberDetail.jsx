import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import theme from '../../../styles/theme';
import { changeMemberRole, unlockMemberLogin } from '../../../features/admin/adminApi';
import { ROLE_LABELS } from '../../../features/auth/roles';
import useAuthStore from '../../../stores/useAuthStore';
import { showToast } from '../../../stores/useToastStore';
import MemberSuspendActions from '../MemberSuspendActions';
import { suspendedText } from '../adminLogFormat';
import '../AdminMembersPanel.css';

const GENDER_LABELS = { MALE: '남성', FEMALE: '여성', NONE: '선택 안 함', 미입력: '미입력' };
const LOGIN_METHODS = { EMAIL: '이메일', GOOGLE: '구글', BOTH: '이메일 · 구글' };

// "2026-10-26T14:22:05" → "2026.10.26"
const formatDate = (value) => (value ? value.slice(0, 10).replaceAll('-', '.') : '-');
// "2026-10-26T14:22:05" → "10.26 14:22"
const formatDateTime = (value) => (value ? `${value.slice(5, 10).replace('-', '.')} ${value.slice(11, 16)}` : '-');

// 서버 오류 문구 (403 이면 관리자 권한이 없다는 뜻)
const errorMessage = (error, fallback) => error.response?.data?.error?.message ?? fallback;

export default function MemberDetail({ member, onClose, onChanged }) {
  return (
    <div className="admin-member-detail">
      <div className="admin-card-heading">
        <div><h3>{member.nickName} 회원 상세</h3><p>회원 번호 {member.id}</p></div>
        <button type="button" className="admin-icon-button" aria-label="회원 상세 닫기" onClick={onClose}>
          <X size={theme.iconSize.md} aria-hidden="true" />
        </button>
      </div>
      <dl className="admin-detail-list">
        <div><dt>이메일</dt><dd>{member.emailMasked}</dd></div>
        <div><dt>가입일</dt><dd>{formatDate(member.joinedAt)}</dd></div>
        <div><dt>로그인 방법</dt><dd>{LOGIN_METHODS[member.loginMethod]}</dd></div>
        <div><dt>권한</dt><dd>{ROLE_LABELS[member.role] ?? member.role}</dd></div>
        <div><dt>나이대 · 성별</dt><dd>{member.ageBand ?? '미입력'} · {GENDER_LABELS[member.gender] ?? '미입력'}</dd></div>
        <div>
          <dt>로그인된 기기</dt>
          <dd>{member.activeSessions}대{member.lastUsedAt ? ` · 마지막 사용 ${formatDateTime(member.lastUsedAt)}` : ''}</dd>
        </div>
        <div>
          <dt>로그인 잠금</dt>
          <dd>
            {member.lockedMinutes > 0 ? `${member.lockedMinutes}분 남음 (5번 실패) ` : '잠금 없음'}
            {member.lockedMinutes > 0 && <UnlockButton member={member} onChanged={onChanged} />}
          </dd>
        </div>
        <div><dt>계정 정지</dt><dd>{member.suspendedUntil ? suspendedText(member.suspendedUntil) : '정지 없음'}</dd></div>
      </dl>
      <RoleActions member={member} onChanged={onChanged} />
      <MemberSuspendActions member={member} onChanged={onChanged} />
    </div>
  );
}

// 로그인 잠금 해제 (관리자 · 총관리자) — 5번 실패로 잠긴 회원이 문의했을 때. 운영 로그에 남는다
function UnlockButton({ member, onChanged }) {
  const [busy, setBusy] = useState(false);

  async function handleUnlock() {
    setBusy(true);
    try {
      await unlockMemberLogin(member.id);
      showToast(`${member.nickName} 님의 로그인 잠금을 풀었어요.`);
      onChanged();
    } catch (err) {
      showToast(errorMessage(err, '잠금을 풀지 못했습니다.'));
      if (err.response?.data?.error?.code === 'TARGET_MEMBER_NOT_FOUND') onChanged(); // 그사이 탈퇴한 회원 → 목록 새로고침
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="admin-text-button" onClick={handleUnlock} disabled={busy}>
      {busy ? '푸는 중…' : '잠금 해제'}
    </button>
  );
}

// 상세 아래 권한 영역 — 총관리자에게만 [관리자로 지정] / [관리자 해제] 버튼, 누르면 한 번 더 확인한다
// 자기 자신 · 총관리자는 바꿀 수 없다 (서버도 같은 규칙으로 막는다)
function RoleActions({ member, onChanged }) {
  const me = useAuthStore((state) => state.member);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canChange = me?.role === 'SUPER_ADMIN' && me.id !== member.id && member.role !== 'SUPER_ADMIN';
  if (!canChange) {
    const reason = me?.role !== 'SUPER_ADMIN'
      ? '관리자 권한은 총관리자만 주고 뺄 수 있습니다.'
      : member.role === 'SUPER_ADMIN' ? '총관리자의 권한은 바꿀 수 없습니다.' : '자기 자신의 권한은 바꿀 수 없습니다.';
    return (
      <div className="admin-inline-note">
        <ShieldCheck size={theme.iconSize.sm} aria-hidden="true" />
        <span>{reason}</span>
      </div>
    );
  }

  const nextRole = member.role === 'ADMIN' ? 'USER' : 'ADMIN';
  const actionLabel = nextRole === 'ADMIN' ? '관리자로 지정' : '관리자 해제';

  async function handleConfirm() {
    setBusy(true);
    setError('');
    try {
      await changeMemberRole(member.id, nextRole);
      showToast(`${member.nickName} 님을 ${nextRole === 'ADMIN' ? '관리자로 지정했어요' : '관리자에서 해제했어요'}. 다시 로그인하면 적용됩니다.`);
      setConfirming(false);
      onChanged(); // 현황 · 목록 다시 불러오기
    } catch (err) {
      if (err.response?.data?.error?.code === 'TARGET_MEMBER_NOT_FOUND') {
        // 그사이 탈퇴한 회원 → 목록을 새로고침하면 이 상세도 사라지므로, 문구는 토스트로 알린다
        showToast(errorMessage(err, '대상 회원을 찾을 수 없습니다.'));
        onChanged();
        return;
      }
      setError(errorMessage(err, '권한을 바꾸지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-member-role">
      {confirming ? (
        <>
          <p>
            <strong>{member.nickName}</strong> 님을 {actionLabel}할까요? 이 회원의 로그인된 기기는 모두 로그아웃되고, 다시 로그인하면 바뀐 권한이 적용됩니다.
          </p>
          <div className="admin-member-role-buttons">
            <button type="button" className="admin-outline-button" onClick={() => setConfirming(false)} disabled={busy}>취소</button>
            <button type="button" className="admin-primary-button" onClick={handleConfirm} disabled={busy}>
              {busy ? '바꾸는 중…' : actionLabel}
            </button>
          </div>
        </>
      ) : (
        <div className="admin-member-role-buttons">
          <span>총관리자 권한: 관리자 권한을 주거나 뺄 수 있습니다.</span>
          <button type="button" className="admin-outline-button" onClick={() => setConfirming(true)}>{actionLabel}</button>
        </div>
      )}
      {error && <p className="admin-member-role-error" role="alert">{error}</p>}
    </div>
  );
}
