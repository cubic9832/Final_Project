import { useId, useRef, useState } from 'react';
import AdminListHeader from '../components/AdminListHeader.jsx';
import AdminDataTable from '../components/AdminDataTable.jsx';
import Pagination from '../../../components/Pagination.jsx';
import AdminEditorFrame from '../components/AdminEditorFrame.jsx';
import { nextTableSort, paginateTableRows, sortTableRows } from '../adminTableData.js';
import { formatAdminDate, formatAdminDateTime } from '../adminDateFormat.js';
import { savePermissionRole, deletePermissionRole, getPermissionCatalog } from '../../../features/admin/adminPermissionApi.js';
import usePermissionData, { permissionError } from './usePermissionData.js';
import PermissionSelection from './PermissionSelection.jsx';
import { PermissionSearch, PermissionLoadState } from './PermissionPanelParts.jsx';
import { showToast } from '../../../stores/useToastStore.js';
import './AdminPermissions.css';

const screenDescriptions = {
  OVERVIEW: '운영 요약과 서비스 연결 상태', VEHICLES: '차량 정보와 공개 상태 관리',
  RECOMMENDATIONS: '추천 후보 차량 확인', MODELS: '추천 모델 상태와 평가 확인',
  MEMBERS: '회원 정보와 계정 상태 관리', CHAT: '대기 상담 배정과 상담 응대',
  CHATBOT: '콤파 대화·평가와 프롬프트 관리', LOGS: '관리자 작업 이력 확인',
};

const columns = [
  { key: 'number', label: '번호', width: 7 }, { key: 'name', label: '역할명', width: 22, align: 'left' },
  { key: 'screens', label: '사용 가능 화면', width: 30 }, { key: 'accountCount', label: '권한 보유 관리자', width: 13 },
  { key: 'createdAt', label: '등록일', width: 18 }, { key: 'manage', label: '관리', width: 10, sortable: false },
];
const values = { number: row => row.listNumber, name: row => row.name, screens: row => row.screenNames,
  accountCount: row => row.accountCount, createdAt: row => row.createdAt };

export default function AdminRolePanel() {
  const { state, reload } = usePermissionData();
  const [draft, setDraft] = useState(''); const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0); const [sort, setSort] = useState({ column: '', direction: 'ASC' });
  const [editing, setEditing] = useState(null);
  const screenName = code => state.screens.find(screen => screen.code === code)?.name || code;
  const filtered = state.roles.map((role, index) => ({ ...role, listNumber: state.roles.length - index, screenNames: role.screens.map(screenName).join(' · ') }))
    .filter(role => `${role.name} ${role.description} ${role.screenNames}`.toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR')));
  const table = paginateTableRows(sortTableRows(filtered, sort, values), page);
  if (editing) return <RoleEditor key={editing.id || 'new'} role={editing} screens={state.screens} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />;
  return <section className="admin-card permission-panel">
    <AdminListHeader title="역할 목록"><div className="permission-heading-tools"><PermissionSearch placeholder="역할명·사용 화면 검색" value={draft} onChange={setDraft} onSubmit={event => { event.preventDefault(); setKeyword(draft.trim()); setPage(0); }} /><button className="admin-primary-button" type="button" disabled={state.status !== 'done'} onClick={() => setEditing({ name: '', description: '', screens: [], version: 0 })}>역할 등록</button></div></AdminListHeader>
    <PermissionLoadState state={state} onRetry={reload} />
    {state.status === 'done' && <><AdminDataTable caption="업무 역할과 사용 가능한 화면" className="permission-table" columns={columns} minWidth="940px" sort={sort} onSort={column => { setSort(current => nextTableSort(current, column)); setPage(0); }}>
      {table.rows.length === 0 ? <tr><td colSpan={columns.length}>조건에 맞는 역할이 없습니다.</td></tr> : table.rows.map(role => <tr key={role.id}>
        <td>{role.listNumber}</td><td className="admin-table-text">{role.name}</td><td className="permission-available-screens">{role.screenNames || '없음'}</td><td>{role.accountCount}명</td><td>{formatAdminDate(role.createdAt)}</td><td><button type="button" className="admin-text-button" onClick={() => setEditing(role)}>{role.systemRole ? '보기' : '수정'}</button></td>
      </tr>)}
    </AdminDataTable>{table.totalPages > 1 && <Pagination page={table.page} totalPages={table.totalPages} onChange={setPage} />}</>}
  </section>;
}

function RoleEditor({ role, screens, onClose, onSaved }) {
  const formId = useId();
  const [form, setForm] = useState({ name: role.name, description: role.description, screens: role.screens });
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const pending = useRef(false);
  const dirty = form.name !== role.name || form.description !== role.description || [...form.screens].sort().join() !== [...role.screens].sort().join();
  async function save(event) {
    event.preventDefault(); if (pending.current) return;
    if (!form.name.trim()) { setError('역할명을 입력해 주세요.'); return; }
    pending.current = true; setBusy(true); setError('');
    try { await savePermissionRole({ ...role, ...form, name: form.name.trim() }); showToast('역할을 저장했습니다.'); window.dispatchEvent(new Event('admin-permissions-changed')); onSaved(); }
    catch (failure) { setError(permissionError(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  async function checkRemoval() {
    setError('');
    const catalog = await getPermissionCatalog();
    const latest = catalog.roles.find(item => item.id === role.id);
    if (!latest) return '이미 삭제된 역할입니다. 목록으로 돌아가 다시 확인해 주세요.';
      if (latest.accountCount > 0) return `현재 관리자 ${latest.accountCount}명이 이 역할을 사용하고 있습니다. 관리자 권한 화면에서 해당 관리자들의 역할 배정을 해제한 뒤 삭제해 주세요.`;
    if (latest.version !== role.version) return '다른 작업에서 역할이 변경되었습니다. 목록으로 돌아가 최신 내용을 확인해 주세요.';
    return '';
  }
  async function remove() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await deletePermissionRole(role); showToast('역할을 삭제했습니다.'); onSaved(); }
    catch (failure) { setError(permissionError(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <AdminEditorFrame title={role.id ? '역할 수정' : '역할 등록'} onCancel={onClose} isDirty={dirty} busy={busy} formId={formId} onDelete={role.id && !role.systemRole ? remove : undefined} checkDelete={checkRemoval} deleteError={error} deleteMessage={`${role.name} 역할을 삭제할까요?`} canSave={!role.systemRole}><form id={formId} className="admin-card permission-form" onSubmit={save}>
    {role.createdAt && <p className="permission-help">등록일 {formatAdminDateTime(role.createdAt)}</p>}
    <label>역할명<input data-autofocus required maxLength={50} value={form.name} disabled={busy || role.systemRole} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
    <label>설명<textarea maxLength={200} rows={3} value={form.description} disabled={busy || role.systemRole} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></label>
    <PermissionSelection label="이 역할에서 사용할 화면" description="허용할 화면을 눌러 선택하세요. 선택한 화면만 해당 역할에 포함됩니다." items={screens.map(screen => ({ value: screen.code, label: screen.name, description: screenDescriptions[screen.code] }))} values={form.screens} onChange={selected => setForm(current => ({ ...current, screens: selected }))} disabled={busy || role.systemRole} />
    {role.accountCount > 0 && <p className="permission-help">저장하면 이 역할을 가진 관리자 {role.accountCount}명의 화면 권한에 반영됩니다.</p>}
    {error && <p className="permission-error" role="alert">{error}</p>}
  </form></AdminEditorFrame>;
}
