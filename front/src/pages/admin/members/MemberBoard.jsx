import { Fragment, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import theme from '../../../styles/theme';
import Pagination from '../../../components/Pagination.jsx';
import { getAdminMembers } from '../../../features/admin/adminApi';
import { ROLE_LABELS } from '../../../features/auth/roles';
import MemberDetail from './MemberDetail.jsx';
import { memberBoardSearch } from './memberBoardSearch.js';
import './MemberBoard.css';

const PAGE_SIZE = 10;
const loginLabels = { EMAIL: '이메일', GOOGLE: '구글', BOTH: '이메일 · 구글' };

export default function MemberBoard({ version, onChanged, summaryState, onRetrySummary }) {
  const initialKeyword = useLocation().state?.memberKeyword ?? '';
  const [draft, setDraft] = useState(initialKeyword);
  const [query, setQuery] = useState({ keyword: initialKeyword, role: '', page: 1 });
  const [state, setState] = useState({ status: 'loading', members: [], meta: null, error: '' });
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getAdminMembers({ ...query, size: PAGE_SIZE }, controller.signal).then(({ members, meta }) => {
      if (!controller.signal.aborted) setState({ status: 'done', members, meta, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ status: 'error', members: [], meta: null, error: error.response?.data?.error?.message || '회원 목록을 불러오지 못했습니다.' });
    });
    return () => controller.abort();
  }, [query, reload, version]);

  function changeQuery(next) {
    setSelectedId(null); setSearchError('');
    setState(current => ({ ...current, status: 'loading' }));
    setQuery(current => ({ ...current, ...next }));
  }
  function search(event) {
    event.preventDefault();
    try { changeQuery({ ...memberBoardSearch(draft), page: 1 }); }
    catch (error) { setSearchError(error.message); }
  }
  function retry() { setState(current => ({ ...current, status: 'loading' })); setReload(value => value + 1); }
  function changed() { setState(current => ({ ...current, status: 'loading' })); onChanged(); }

  return <section className="admin-card member-board-panel">
    <div className="member-board-heading"><h3>회원 목록</h3>
      <form className="member-board-search" onSubmit={search}><div className="admin-search-field form-focus-group">
        <input type="search" maxLength={100} aria-label="닉네임, 이메일 또는 권한 검색" placeholder="닉네임·이메일·권한 검색" value={draft} onChange={event => setDraft(event.target.value)} />
        <button type="submit" aria-label="회원 검색"><Search size={theme.iconSize.md} aria-hidden="true" /></button>
      </div></form>
    </div>
    {summaryState.status === 'done' && <p className="member-board-counts" role="status"><span>최근 7일 가입 {summaryState.data.newLast7Days.toLocaleString()}명</span><span>구글 로그인 {summaryState.data.google.toLocaleString()}명</span><span>이메일 로그인 {summaryState.data.email == null ? '확인 필요' : `${summaryState.data.email.toLocaleString()}명`}</span><span>관리자 {summaryState.data.admins.toLocaleString()}명(총관리자 포함)</span></p>}
    {summaryState.status === 'loading' && <p className="member-board-counts" role="status">회원 현황을 불러오는 중…</p>}
    {summaryState.status === 'error' && <p className="member-board-error" role="alert">{summaryState.error} <button type="button" className="admin-text-button" onClick={onRetrySummary}>다시 시도</button></p>}
    {searchError && <p className="member-board-error" role="alert">{searchError}</p>}
    {state.status === 'loading' && <p className="admin-empty" role="status">회원 목록을 불러오는 중…</p>}
    {state.status === 'error' && <p className="admin-empty" role="alert">{state.error} <button className="admin-text-button" type="button" onClick={retry}>다시 시도</button></p>}
    {state.status === 'done' && <>
      <div className="member-board-wrap"><table className="member-board">
        <caption className="admin-sr-only">회원 목록과 계정 상태</caption>
        <colgroup>{[7, 29, 13, 14, 11, 18, 8].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
        <thead><tr>{['번호', '회원', '가입일', '로그인 방법', '권한', '상태', '상세'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{state.members.length === 0 ? <tr><td colSpan={7} className="member-board-empty">조건에 맞는 회원이 없습니다.</td></tr> : state.members.map((member, index) => {
          const open = selectedId === member.id;
          const toggle = () => setSelectedId(open ? null : member.id);
          const detailId = `member-board-detail-${member.id}`;
          return <Fragment key={member.id}><tr className={open ? 'member-board-selected' : ''}>
            <td>{state.meta.total - (query.page - 1) * PAGE_SIZE - index}</td>
            <td><button type="button" className="member-board-subject" aria-expanded={open} aria-controls={detailId} onClick={toggle}>{member.nickName}<span>{member.emailMasked}</span></button></td>
            <td>{member.joinedAt?.slice(0, 10) || '미입력'}</td><td>{loginLabels[member.loginMethod] ?? member.loginMethod}</td><td>{ROLE_LABELS[member.role] ?? member.role}</td>
            <td><span className={`admin-status ${member.suspendedUntil || member.lockedMinutes > 0 ? 'is-check' : 'is-ok'}`}>{member.suspendedUntil ? member.suspendedUntil.startsWith('9999') ? '영구 정지' : '기간 정지' : member.lockedMinutes > 0 ? `로그인 잠금 ${member.lockedMinutes}분` : '정상'}</span></td>
            <td><button type="button" className="admin-text-button" aria-expanded={open} aria-controls={detailId} aria-label={`${member.nickName} 상세 ${open ? '접기' : '보기'}`} onClick={toggle}>{open ? '접기' : '보기'}</button></td>
          </tr>{open && <tr><td colSpan={7} className="member-board-detail-cell"><section id={detailId} aria-label={`${member.nickName} 회원 상세`}><MemberDetail member={member} onClose={() => setSelectedId(null)} onChanged={changed} /></section></td></tr>}</Fragment>;
        })}</tbody>
      </table></div>
      <Pagination ariaLabel="회원 목록 페이지" page={query.page - 1} totalPages={Math.max(1, state.meta.totalPages)} onChange={page => changeQuery({ page: page + 1 })} />
    </>}
  </section>;
}
