import { useState } from 'react';
import { Ban } from 'lucide-react';
import theme from '../../styles/theme';
import { suspendMember, unsuspendMember } from '../../features/admin/adminApi';
import ChoiceWithOther from '../../features/chat/components/ChoiceWithOther';
import { OTHER, choiceText } from '../../features/chat/choice';
import { suspendedText } from './adminLogFormat';
import useAuthStore from '../../stores/useAuthStore';
import { showToast } from '../../stores/useToastStore';

// 9단계: 회원 상세 아래 계정 정지 영역 — 총관리자에게만 보인다 (서버도 총관리자인지 한 번 더 확인)
// 정지하면: 로그인 · 구글 로그인 · 로그인 유지 · 탈퇴가 막히고, 로그인된 기기는 모두 로그아웃 (이미 받은 토큰은 최대 30분)
// 관리자 계정은 먼저 [관리자 해제] 를 해야 정지할 수 있다

const DAYS = [
  { value: 1, label: '1일' }, { value: 3, label: '3일' }, { value: 7, label: '7일' }, { value: 30, label: '30일' },
  { value: 0, label: '영구' },
];
const REASONS = ['욕설 · 비하 반복', '서비스 악용 (도배 · 자동 요청)', '다른 회원 · 상담원 괴롭힘', '사칭 · 거짓 정보', '상담 제한 뒤에도 반복', OTHER];

const errorMessage = (error, fallback) => error.response?.data?.error?.message ?? fallback;

export default function MemberSuspendActions({ member, onChanged }) {
  const me = useAuthStore((state) => state.member);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [choice, setChoice] = useState('');
  const [other, setOther] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (me?.role !== 'SUPER_ADMIN' || me.id === member.id) return null;

  if (member.role !== 'USER') {
    return (
      <div className="admin-inline-note">
        <Ban size={theme.iconSize.sm} aria-hidden="true" />
        <span>관리자 계정은 정지할 수 없습니다. 먼저 관리자 권한을 빼 주세요.</span>
      </div>
    );
  }

  const reason = choiceText(choice, other);
  const periodLabel = DAYS.find((option) => option.value === days)?.label;

  // 서버 요청 하나를 감싸서: 성공하면 알림 + 목록 다시 불러오기, 실패하면 문구 (그사이 탈퇴했으면 목록 새로고침)
  async function run(request, done) {
    setBusy(true);
    setError('');
    try {
      await request();
      showToast(done);
      setOpen(false);
      setConfirming(false);
      onChanged();
    } catch (err) {
      if (err.response?.data?.error?.code === 'TARGET_MEMBER_NOT_FOUND') {
        showToast(errorMessage(err, '대상 회원을 찾을 수 없습니다.'));
        onChanged();
        return;
      }
      setError(errorMessage(err, '처리하지 못했습니다.'));
    } finally {
      setBusy(false);
    }
  }

  // 정지 중: 언제까지인지 + [정지 풀기]
  if (member.suspendedUntil) {
    return (
      <div className="admin-member-role">
        <p><strong>{member.nickName}</strong> 님은 {suspendedText(member.suspendedUntil)} 상태입니다. 사유는 운영 로그에서 볼 수 있어요.</p>
        {error && <p className="admin-member-role-error" role="alert">{error}</p>}
        <div className="admin-member-role-buttons">
          <button type="button" className="admin-outline-button" disabled={busy}
            onClick={() => run(() => unsuspendMember(member.id), `${member.nickName} 님의 계정 정지를 풀었어요.`)}>
            {busy ? '푸는 중…' : '정지 풀기'}
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="admin-member-role">
        <div className="admin-member-role-buttons">
          <button type="button" className="admin-outline-button" onClick={() => setOpen(true)}>
            <Ban size={theme.iconSize.sm} aria-hidden="true" />계정 정지
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="admin-member-role admin-member-suspend" onSubmit={(event) => { event.preventDefault(); if (reason) setConfirming(true); }}>
      <label>
        정지 기간
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          {DAYS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <ChoiceWithOther label="정지 사유 (운영 로그에만 남아요)" otherLabel="기타 사유" maxLength={100}
        options={REASONS} choice={choice} other={other} onChoice={setChoice} onOther={setOther} />
      {confirming && (
        <p>
          <strong>{member.nickName}</strong> 님의 계정을 <strong>{periodLabel}</strong> 정지할까요? 로그인된 기기는 모두 로그아웃되고,
          정지 중에는 로그인 · 탈퇴를 할 수 없습니다.
        </p>
      )}
      {error && <p className="admin-member-role-error" role="alert">{error}</p>}
      <div className="admin-member-role-buttons">
        <button type="button" className="admin-outline-button" disabled={busy}
          onClick={() => { setOpen(false); setConfirming(false); }}>취소</button>
        {confirming ? (
          <button type="button" className="admin-primary-button" disabled={busy}
            onClick={() => run(() => suspendMember(member.id, days, reason), `${member.nickName} 님의 계정을 ${periodLabel} 정지했어요.`)}>
            {busy ? '정지하는 중…' : `${periodLabel} 정지`}
          </button>
        ) : (
          <button type="submit" className="admin-primary-button" disabled={!reason}>다음</button>
        )}
      </div>
    </form>
  );
}
