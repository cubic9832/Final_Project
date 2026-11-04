// 7단계: 운영 로그 표시 도우미 (운영 로그 탭 · 운영 현황 "최근 운영 이력" 이 같이 쓴다)
import { ROLE_LABELS } from '../../features/auth/roles';

// 작업 코드 → 화면 이름 (8단계 상담 기록 · 보완 13 메일 기록 포함, 없으면 코드 그대로 보인다)
export const ACTION_LABELS = {
  ROLE_CHANGE: '권한 변경',
  LOGIN_UNLOCK: '잠금 해제',
  CHAT_WARN: '상담 경고',
  CHAT_RESTRICT: '상담 제한',
  CHAT_UNRESTRICT: '상담 제한 풀기',
  CHAT_TRANSFER: '상담 넘기기',
  MEMBER_SUSPEND: '계정 정지',
  MEMBER_UNSUSPEND: '계정 정지 풀기',
  MAIL_SENT: '메일 발송',
  MAIL_FAILED: '메일 발송 실패',
  MODEL_TRAFFIC_CHANGE: '모델 비율 변경',
};

// "2026-10-26T17:30:12" → "2026.10.26 17:30"
export const formatLogTime = (value) => `${value.slice(0, 10).replaceAll('-', '.')} ${value.slice(11, 16)}`;

// 9단계: 계정 정지 표시 — "9999-12-31T23:59:59" → "영구 정지", 그 밖은 "11.09 14:00까지 정지"
export const suspendedText = (until) =>
  until.startsWith('9999') ? '영구 정지' : `${until.slice(5, 10).replace('-', '.')} ${until.slice(11, 16)}까지 정지`;

// 이름이 없으면(탈퇴) 번호와 함께 "탈퇴한 회원"
export const personName = (nickName, id) => nickName ?? (id ? `탈퇴한 회원 #${id}` : '탈퇴한 회원');

// 보완 13: 메일 발송 기록은 서버가 자동으로 남긴다 (관리자 · 대상 회원이 없음)
const isMailLog = (log) => log.targetType === 'MAIL';
export const logActor = (log) => (isMailLog(log) ? '서버 (자동)' : personName(log.actorNickName, log.actorId));
export const logTarget = (log) => {
  if (isMailLog(log)) return '인증 메일';
  if (log.targetType === 'MODEL') return '추천 모델';
  return personName(log.targetNickName, log.targetId);
};

// "USER → ADMIN" → "일반 회원 → 관리자" (권한 변경일 때)
export const describeLog = (log) =>
  log.action === 'ROLE_CHANGE'
    ? log.detail.split(' → ').map((role) => ROLE_LABELS[role] ?? role).join(' → ')
    : log.detail;
