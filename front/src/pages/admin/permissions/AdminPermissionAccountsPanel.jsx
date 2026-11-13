import { useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminListHeader from '../components/AdminListHeader.jsx';
import AdminDataTable from '../components/AdminDataTable.jsx';
import Pagination from '../../../components/Pagination.jsx';
import AdminEditorFrame from '../components/AdminEditorFrame.jsx';
import { nextTableSort, paginateTableRows, sortTableRows } from '../adminTableData.js';
import { formatAdminDate, formatAdminDateTime } from '../adminDateFormat.js';
import { getAdminMembers } from '../../../features/admin/adminApi.js';
import { assignPermissionRoles } from '../../../features/admin/adminPermissionApi.js';
import useAuthStore from '../../../stores/useAuthStore.js';
import { showToast } from '../../../stores/useToastStore.js';
import usePermissionData, { permissionError } from './usePermissionData.js';
import PermissionSelection from './PermissionSelection.jsx';
import { PermissionSearch, PermissionLoadState } from './PermissionPanelParts.jsx';
import './AdminPermissions.css';

const columns = [
  { key: 'number', label: '번호', width: 8 }, { key: 'nickName', label: '관리자', width: 24, align: 'left' },
  { key: 'roleNames', label: '부여된 권한', width: 36 }, { key: 'createdAt', label: '등록일', width: 20 },
  { key: 'manage', label: '관리', width: 12, sortable: false },
];
const values = { number: row => row.listNumber, nickName: row => row.nickName, roleNames: row => row.roleNames, createdAt: row => row.createdAt };

export default function AdminPermissionAccountsPanel() {
  const { state, reload } = usePermissionData(true);
  const [params] = useSearchParams();
  const me = useAuthStore(store => store.member);
  const [draft, setDraft] = useState(''); const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0); const [sort, setSort] = useState({ column: '', direction: 'ASC' });
  const [editing, setEditing] = useState(() => params.get('memberKeyword') ? { search: params.get('memberKeyword') } : null);
  const roleName = id => state.roles.find(role => role.id === id)?.name || '확인 필요';
  const rows = state.accounts.map((account, index) => ({ ...account, listNumber: state.accounts.length - index,
    roleNames: account.role === 'SUPER_ADMIN' ? '총관리자 · 전체 화면' : account.roleIds.map(roleName).join(' · ') }))
    .filter(account => `${account.nickName} ${account.roleNames}`.toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR')));
  const table = paginateTableRows(sortTableRows(rows, sort, values), page);
  if (editing && state.status === 'done') return <AccountEditor initial={editing} accounts={state.accounts} roles={state.roles} screens={state.screens} me={me} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); window.dispatchEvent(new Event('admin-permissions-changed')); }} />;
  return <section className="admin-card permission-panel">
    <AdminListHeader title="관리자 목록"><div className="permission-heading-tools"><PermissionSearch placeholder="관리자 닉네임·권한 검색" value={draft} onChange={setDraft} onSubmit={event => { event.preventDefault(); setKeyword(draft.trim()); setPage(0); }} /><button type="button" className="admin-primary-button" onClick={() => setEditing({ search: '' })}>권한 부여</button></div></AdminListHeader>
    <PermissionLoadState state={state} onRetry={reload} />
    {state.status === 'done' && <><AdminDataTable caption="관리자별 부여 권한" columns={columns} className="permission-table" minWidth="800px" sort={sort} onSort={column => { setSort(current => nextTableSort(current, column)); setPage(0); }}>
      {table.rows.length === 0 ? <tr><td colSpan={columns.length}>조건에 맞는 관리자가 없습니다.</td></tr> : table.rows.map(account => <tr key={account.userId}>
        <td>{account.listNumber}</td>
        <td className="admin-table-text">{account.nickName}</td>
        <td className="permission-assigned-roles">{account.role === 'SUPER_ADMIN' ? '총관리자' : account.roleNames || '배정 없음'}</td>
        <td>{formatAdminDate(account.createdAt)}</td>
        <td><div className="permission-row-action">{account.role === 'SUPER_ADMIN' || Number(me?.id) === account.userId
          ? <span className="permission-help">변경 불가</span>
          : <button type="button" className="admin-text-button" aria-label={`${account.nickName} 권한 변경`} onClick={() => setEditing({ account })}>권한 변경</button>}</div></td>
      </tr>)}
    </AdminDataTable>{table.totalPages > 1 && <Pagination page={table.page} totalPages={table.totalPages} onChange={next => { setPage(next); }} />}</>}
  </section>;
}

function AccountEditor({ initial, accounts, roles, screens, me, onClose, onSaved }) {
  const formId = useId();
  const [target, setTarget] = useState(initial.account || null);
  const [selected, setSelected] = useState(initial.account?.roleIds || []);
  const [query, setQuery] = useState(initial.search || '');
  const [appliedQuery, setAppliedQuery] = useState(initial.search || ''); const [results, setResults] = useState(null);
  const [listLoading, setListLoading] = useState(!initial.account);
  const [resultPage, setResultPage] = useState(1); const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const pending = useRef(false);
  const oldIds = target?.roleIds || [];
  const rolesChanged = [...selected].sort().join() !== [...oldIds].sort().join();
  const dirty = (!initial.account && Boolean(target)) || rolesChanged;
  useEffect(() => {
    if (initial.account) return;
    const controller = new AbortController();
    getAdminMembers({ keyword: initial.search || '', role: 'NOT_SUPER_ADMIN', page: 1, size: 20 }, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        setResults(response.members); setResultPage(1); setTotalPages(response.meta.totalPages);
      })
      .catch(failure => { if (!controller.signal.aborted) setError(permissionError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    return () => controller.abort();
  }, [initial.account, initial.search]);
  async function search(event, page = 1) {
    event?.preventDefault(); if (pending.current || listLoading) return;
    pending.current = true; setBusy(true); setError('');
    try { const response = await getAdminMembers({ keyword: event ? query.trim() : appliedQuery, role: 'NOT_SUPER_ADMIN', page, size: 20 }); setAppliedQuery(event ? query.trim() : appliedQuery); setResults(response.members); setResultPage(page); setTotalPages(response.meta.totalPages); }
    catch (failure) { setError(permissionError(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  function choose(member) {
    const account = accounts.find(item => item.userId === member.id);
    setTarget(account || { userId: member.id, nickName: member.nickName, role: member.role, roleIds: [] }); setSelected(account?.roleIds || []); setError('');
  }
  async function save(event) {
    event.preventDefault(); if (!target || pending.current) return;
    if (!oldIds.length && !selected.length) { setError('부여할 권한을 선택해 주세요.'); return; }
    pending.current = true; setBusy(true); setError('');
    try { await assignPermissionRoles(target.userId, selected, oldIds); showToast('관리자 권한을 반영했습니다.'); onSaved(); }
    catch (failure) { setError(permissionError(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <AdminEditorFrame title={initial.account ? '관리자 권한 변경' : '관리자 권한 부여'} onCancel={onClose} busy={busy} isDirty={dirty} formId={formId} canSave={Boolean(target)} saveDisabled={!rolesChanged} saveLabel={oldIds.length && !selected.length ? '권한 회수' : '저장'}><section className="admin-card permission-form">
    {!target ? <><PermissionSearch placeholder="회원 닉네임·이메일 검색" value={query} onChange={setQuery} onSubmit={search} />{listLoading && <p role="status">회원 목록을 불러오는 중입니다.</p>}{results && <><div className="permission-member-scroll" role="region" aria-label="권한을 부여할 회원 목록" aria-busy={busy} tabIndex={0}><ul className="permission-member-results">{results.map(member => <li key={member.id}><span>{member.nickName} <small>{member.emailMasked}</small></span><button type="button" className="admin-outline-button" disabled={busy || Number(me?.id) === member.id || member.role === 'SUPER_ADMIN'} onClick={() => choose(member)}>선택</button></li>)}</ul>{results.length === 0 && <p>조건에 맞는 회원이 없습니다.</p>}</div>{totalPages > 1 && <Pagination page={resultPage - 1} totalPages={totalPages} onChange={next => search(null, next + 1)} />}</>}</> : <form id={formId} onSubmit={save} className="permission-form">
      <dl className="permission-account-info"><div><dt>대상 회원</dt><dd><strong>{target.nickName}</strong></dd></div>{target.createdAt && <div><dt>등록일</dt><dd>{formatAdminDateTime(target.createdAt)}</dd></div>}</dl>
      <PermissionSelection label="부여할 업무 권한" description="허용할 업무를 선택하세요. 여러 권한을 함께 부여할 수 있습니다." items={roles.map(role => ({ value: role.id, label: role.name, description: role.screens.length ? screens.filter(screen => role.screens.includes(screen.code)).map(screen => screen.name).join(' · ') : '사용 가능한 화면 없음' }))} values={selected} onChange={setSelected} disabled={busy} />
      <div className="permission-screen-summary"><h4>선택한 권한으로 사용 가능한 화면</h4>{selected.length > 0 && screens.some(screen => roles.some(role => selected.includes(role.id) && role.screens.includes(screen.code))) ? <ul className="permission-screen-chips">{screens.filter(screen => roles.some(role => selected.includes(role.id) && role.screens.includes(screen.code))).map(screen => <li key={screen.code}>{screen.name}</li>)}</ul> : <p>사용 가능한 화면이 없습니다.</p>}<p className="permission-help">저장하면 선택한 권한이 해당 관리자에게 반영됩니다.</p></div>
      {oldIds.length > 0 && selected.length === 0 && <p className="permission-help">모든 관리자 권한을 회수하면 일반 회원으로 전환됩니다.</p>}

    </form>}{error && <p role="alert" className="permission-error">{error}</p>}
  </section></AdminEditorFrame>;
}
