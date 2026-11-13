import { ROLE_LABELS } from '../../../features/auth/roles.js';
import { sortTableRows } from '../adminTableData.js';

export const memberLoginLabels = { EMAIL: '이메일', GOOGLE: '구글', BOTH: '이메일 · 구글' };
export const memberStatusLabel = member => member.suspendedUntil
  ? member.suspendedUntil.startsWith('9999') ? '영구 정지' : '기간 정지'
  : member.lockedMinutes > 0 ? `로그인 잠금 ${member.lockedMinutes}분` : '정상';

const values = {
  number: member => member.listNumber,
  member: member => member.nickName || null,
  joinedAt: member => member.joinedAt?.slice(0, 10) || null,
  loginMethod: member => memberLoginLabels[member.loginMethod] ?? member.loginMethod,
  role: member => ROLE_LABELS[member.role] ?? member.role,
  status: memberStatusLabel,
};

export const sortMembers = (members, sort) => sortTableRows(members, sort, values);
