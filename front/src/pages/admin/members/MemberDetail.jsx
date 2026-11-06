import { X } from 'lucide-react';
import theme from '../../../styles/theme';
import { unlockMemberLogin } from '../../../features/admin/adminApi';
import useActionLock from '../../../features/admin/useActionLock';
import { ROLE_LABELS } from '../../../features/auth/roles';
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
      <MemberSuspendActions member={member} onChanged={onChanged} />
    </div>
  );
}

// 로그인 잠금 해제 (관리자 · 총관리자) — 5번 실패로 잠긴 회원이 문의했을 때. 운영 로그에 남는다
function UnlockButton({ member, onChanged }) {
  const lock = useActionLock(member); // 성공 뒤 목록이 다시 올 때까지 잠근다 (같은 요청이 다시 가지 않게)
  const busy = lock.locked;

  async function handleUnlock() {
    try {
      if (!(await lock.run(() => unlockMemberLogin(member.id)))) return;
      showToast(`${member.nickName} 님의 로그인 잠금을 풀었어요.`);
      onChanged();
    } catch (err) {
      showToast(errorMessage(err, '잠금을 풀지 못했습니다.'));
      if (err.response?.data?.error?.code === 'TARGET_MEMBER_NOT_FOUND') onChanged(); // 그사이 탈퇴한 회원 → 목록 새로고침
    }
  }

  return (
    <button type="button" className="admin-text-button" onClick={handleUnlock} disabled={busy}>
      {busy ? '푸는 중…' : '잠금 해제'}
    </button>
  );
}
