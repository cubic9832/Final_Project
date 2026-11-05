import AdminListHeader from '../components/AdminListHeader.jsx';
import AdminDataTable from '../components/AdminDataTable.jsx';
import AdminDetailRow from '../components/AdminDetailRow.jsx';
import { Fragment, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import theme from '../../../styles/theme';
import Pagination from '../../../components/Pagination.jsx';
import { getAllAdminMembers } from '../../../features/admin/adminApi';
import { ROLE_LABELS } from '../../../features/auth/roles';
import MemberDetail from './MemberDetail.jsx';
import { memberBoardSearch } from './memberBoardSearch.js';
import { memberLoginLabels, memberStatusLabel, sortMembers } from './memberBoardData.js';
import { nextTableSort, paginateTableRows } from '../adminTableData.js';
import { formatAdminDate } from '../adminDateFormat.js';
import './MemberBoard.css';

const tableColumns = [
  { key: 'number', label: '번호', width: 7 },
  { key: 'member', label: '회원', width: 29, align: 'left' },
  { key: 'loginMethod', label: '로그인 방법', width: 14 },
  { key: 'role', label: '권한', width: 11 },
  { key: 'status', label: '상태', width: 18 },
  { key: 'joinedAt', label: '가입일', width: 13 },
  { key: 'detail', label: '상세', width: 8, sortable: false },
];

export default function MemberBoard({ version, onChanged, summaryState, onRetrySummary }) {
  const initialKeyword = useLocation().state?.memberKeyword ?? '';
  const [draft, setDraft] = useState(initialKeyword);
  const [query, setQuery] = useState({ keyword: initialKeyword, role: '' });
  const [state, setState] = useState({ status: 'loading', members: [], error: '' });
  const [sort, setSort] = useState({ column: '', direction: 'ASC' });
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getAllAdminMembers(query, controller.signal).then(members => {
      if (!controller.signal.aborted) setState({ status: 'done', members, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ status: 'error', members: [], error: error.response?.data?.error?.message || '회원 목록을 불러오지 못했습니다.' });
    });
    return () => controller.abort();
  }, [query, reload, version]);

  function changeQuery(next) {
    setSelectedId(null); setSearchError(''); setPage(0);
    setState(current => ({ ...current, status: 'loading' }));
    setQuery(current => ({ ...current, ...next }));
  }
  function search(event) {
    event.preventDefault();
    try { changeQuery(memberBoardSearch(draft)); }
    catch (error) { setSearchError(error.message); }
  }
  function retry() { setState(current => ({ ...current, status: 'loading' })); setReload(value => value + 1); }
  function changed() { setState(current => ({ ...current, status: 'loading' })); onChanged(); }
  function sortBy(column) {
    setSort(current => nextTableSort(current, column));
    setPage(0); setSelectedId(null);
  }
  const { rows, page: currentPage, totalPages } = paginateTableRows(sortMembers(state.members, sort), page);

  return <section className="admin-card member-board-panel">
    <AdminListHeader className="member-board-heading" title="회원 목록">
      <form className="member-board-search" onSubmit={search}><div className="admin-search-field form-focus-group">
        <input type="search" maxLength={100} aria-label="닉네임, 이메일 또는 권한 검색" placeholder="닉네임·이메일·권한 검색" value={draft} onChange={event => setDraft(event.target.value)} />
        <button type="submit" aria-label="회원 검색"><Search size={theme.iconSize.md} aria-hidden="true" /></button>
      </div></form>
    </AdminListHeader>
    {summaryState.status === 'done' && <p className="member-board-counts" role="status"><span>최근 7일 가입 {summaryState.data.newLast7Days.toLocaleString()}명</span><span>구글 로그인 {summaryState.data.google.toLocaleString()}명</span><span>이메일 로그인 {summaryState.data.email == null ? '확인 필요' : `${summaryState.data.email.toLocaleString()}명`}</span><span>관리자 {summaryState.data.admins.toLocaleString()}명(총관리자 포함)</span></p>}
    {summaryState.status === 'loading' && <p className="member-board-counts" role="status">회원 현황을 불러오는 중…</p>}
    {summaryState.status === 'error' && <p className="member-board-error" role="alert">{summaryState.error} <button type="button" className="admin-text-button" onClick={onRetrySummary}>다시 시도</button></p>}
    {searchError && <p className="member-board-error" role="alert">{searchError}</p>}
    {state.status === 'loading' && <p className="admin-empty" role="status">회원 목록을 불러오는 중…</p>}
    {state.status === 'error' && <p className="admin-empty" role="alert">{state.error} <button className="admin-text-button" type="button" onClick={retry}>다시 시도</button></p>}
    {state.status === 'done' && <>
      <AdminDataTable className="member-board" caption="회원 목록과 계정 상태" columns={tableColumns} minWidth="940px" sort={sort} onSort={sortBy}>
        {rows.length === 0 ? <tr><td colSpan={7} className="member-board-empty">조건에 맞는 회원이 없습니다.</td></tr> : rows.map(member => {
          const open = selectedId === member.id;
          const toggle = () => setSelectedId(open ? null : member.id);
          const detailId = `member-board-detail-${member.id}`;
          return <Fragment key={member.id}><tr className={open ? 'member-board-selected' : ''}>
            <td>{member.listNumber}</td>
            <td className="admin-table-text"><button type="button" className="member-board-subject" aria-expanded={open} aria-controls={detailId} onClick={toggle}>{member.nickName}</button></td>
            <td>{memberLoginLabels[member.loginMethod] ?? member.loginMethod}</td><td>{ROLE_LABELS[member.role] ?? member.role}</td>
            <td><span className={`admin-status ${member.suspendedUntil || member.lockedMinutes > 0 ? 'is-check' : 'is-ok'}`}>{memberStatusLabel(member)}</span></td>
            <td>{formatAdminDate(member.joinedAt, '미입력')}</td>
            <td><button type="button" className="admin-text-button" aria-expanded={open} aria-controls={detailId} aria-label={`${member.nickName} 상세 ${open ? '접기' : '보기'}`} onClick={toggle}>{open ? '접기' : '보기'}</button></td>
          </tr><AdminDetailRow open={open} colSpan={tableColumns.length} className="member-board-detail-cell"><section id={detailId} aria-label={`${member.nickName} 회원 상세`}><MemberDetail member={member} onClose={() => setSelectedId(null)} onChanged={changed} /></section></AdminDetailRow></Fragment>;
        })}
      </AdminDataTable>
      <Pagination ariaLabel="회원 목록 페이지" page={currentPage} totalPages={totalPages} onChange={next => { setPage(next); setSelectedId(null); }} />
    </>}
  </section>;
}
