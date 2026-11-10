import AdminListHeader from './components/AdminListHeader.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore.js';
import { Car, Plus, Search } from 'lucide-react';
import theme from '../../styles/theme';
import VehicleEditor from './vehicles/VehicleEditor.jsx';
import VehicleBoard from './vehicles/VehicleBoard.jsx';
import { sortVehicleRows } from './vehicles/vehicleBoardSort.js';
import { nextTableSort, paginateTableRows } from './adminTableData.js';
import Pagination from '../../components/Pagination.jsx';
import { filterVehicleRows } from './vehicles/vehicleBoardSearch.js';
import { listAdminVehicles, saveAdminVehicle, adminVehicleError, changeVehicleDeleted } from './vehicles/adminVehicleApi.js';
import './vehicles/VehicleManagement.css';

export default function AdminVehiclesPanel() {
  const [params] = useSearchParams();
  const initialKeyword = params.get('status') === 'REVIEW' ? '검수대기' : '';
  const [sort, setSort] = useState({ column: '', direction: 'ASC' });
  const [searchText, setSearchText] = useState(initialKeyword);
  const [trash, setTrash] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const [vehicles, setVehicles] = useState([]);
  const member = useAuthStore(state => state.member);
  const initialized = useAuthStore(state => state.initialized);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const pendingSave = useRef(false);
  useEffect(() => {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(member?.role)) return;
    const controller = new AbortController();
    setLoading(true); setLoadError('');
    listAdminVehicles(controller.signal).then(rows => { if (!controller.signal.aborted) setVehicles(rows); })
      .catch(error => { if (!controller.signal.aborted) setLoadError(adminVehicleError(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [member?.role, reload]);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const addButton = useRef(null);
  const matchingRows = filterVehicleRows(vehicles, keyword, trash);
  const reviewOnly = params.get('status') === 'REVIEW' && keyword === '검수대기';
  const rows = reviewOnly ? matchingRows.filter(vehicle => vehicle.status === '검수 대기') : matchingRows;
  const boardRows = sortVehicleRows(rows, sort);
  const { page: boardPage, totalPages: pageCount, rows: visibleRows } = paginateTableRows(boardRows, page - 1);
  const currentPage = boardPage + 1;
  const applySearch = value => { setKeyword(value); setPage(1); };
  const resetSearch = () => { setKeyword(''); setSearchText(''); setPage(1); };
  function sortBy(column) {
    setSort(current => nextTableSort(current, column));
    setPage(1);
  }
  function openEditor(vehicle = null, duplicate = false) {
    setNotice(''); setActionError(''); setSaveError(''); setFieldErrors({});
    setEditor({ vehicle: duplicate ? { ...vehicle, id: '', trim: `${vehicle.trim} 사본`, status: '작성 중' } : vehicle });
  }
  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => addButton.current?.focus());
  }
  async function saveVehicle(vehicle) {
    if (pendingSave.current) return;
    pendingSave.current = true; setSaving(true); setSaveError(''); setFieldErrors({});
    try {
      const next = await saveAdminVehicle(vehicle);
      setVehicles(current => [next, ...current.filter(item => item.id !== next.id)]);
      setTrash(false); resetSearch(); closeEditor(); setNotice(`${next.model} 정보를 저장했어요.${next.status === '공개' ? ' 다음 추천 요청부터 반영됩니다.' : ' 공개 전까지 추천에 포함되지 않습니다.'}`);
    } catch (error) {
      setSaveError(adminVehicleError(error));
      const names = { priceWon: 'price', bodyType: 'body', lengthMm: 'length', imageUrl: 'image', sourceName: 'source' };
      setFieldErrors(Object.fromEntries((error.response?.data?.errors || []).map(item => [names[item.field] || item.field, item.message])));
    } finally { pendingSave.current = false; setSaving(false); }
  }
  async function updateDeletion(vehicle, deleted) {
    if (actionPending.current) return;
    actionPending.current = true; setBusy(true); setActionError('');
    try {
      const next = await changeVehicleDeleted(vehicle, deleted);
      setVehicles(current => current.map(item => item.id === next.id ? next : item));
      if (deleted && editor) closeEditor();
      setNotice(deleted ? '차량을 휴지통으로 이동했습니다. 추천에서 제외되며 복구할 수 있습니다.' : '작성 중 상태로 복구했습니다. 검수 후 공개해 주세요.');
    } catch (error) { setActionError(adminVehicleError(error)); }
    finally { actionPending.current = false; setBusy(false); }
  }
  if (!initialized) return <p role="status">로그인 정보를 확인하고 있어요.</p>;
  if (!['ADMIN', 'SUPER_ADMIN'].includes(member?.role)) return <section className="admin-card"><h3>관리자 전용 기능입니다.</h3><p>차량 정보를 관리하려면 관리자 권한이 있는 계정으로 로그인해 주세요.</p>{!member && <Link to="/login">로그인</Link>}</section>;
  if (editor) return <VehicleEditor key={editor.vehicle?.id || 'new'} vehicle={editor.vehicle} onDelete={editor.vehicle?.id ? () => updateDeletion(editor.vehicle, true) : undefined} onClone={draft => openEditor(draft, true)} onCancel={closeEditor} onSave={saveVehicle} saving={saving || busy} saveError={saveError || actionError} fieldErrors={fieldErrors} />;
  if (loading) return <p role="status">차량 목록을 불러오고 있어요.</p>;
  if (loadError) return <section className="admin-card"><p role="alert">{loadError}</p><button type="button" className="admin-outline-button" onClick={() => setReload(value => value + 1)}>다시 불러오기</button></section>;
  return <div className="admin-panel-stack vehicle-management">
    {actionError && <p role="alert">{actionError}</p>}


    <section className="admin-card"><AdminListHeader className="vehicle-board-heading" title={trash ? '차량 휴지통' : '차량 목록'}><div className="vehicle-board-heading-actions"><form className="vehicle-board-search" onSubmit={event => { event.preventDefault(); applySearch(searchText.trim()); }}><div className="admin-search-field form-focus-group"><input type="search" aria-label="브랜드, 차량명, 트림, 연료 또는 관리 상태 검색" placeholder="브랜드·차량명·연료·상태 검색" maxLength={50} value={searchText} onChange={event => setSearchText(event.target.value)} /><button type="submit" aria-label="차량 검색"><Search size={theme.iconSize.md} aria-hidden="true" /></button></div></form><button ref={addButton} type="button" className="admin-primary-button" onClick={() => openEditor()}><Plus size={theme.iconSize.sm} aria-hidden="true" />차량 등록</button></div></AdminListHeader>
      <div className="vehicle-board-summary"><p role="status">차량 모델 {new Set(rows.map(vehicle => JSON.stringify([vehicle.brand, vehicle.model]))).size.toLocaleString()}개<span>국산 {rows.filter(vehicle => vehicle.origin === '국산').length.toLocaleString()}건</span><span>수입 {rows.filter(vehicle => vehicle.origin === '수입').length.toLocaleString()}건</span></p></div>
      <VehicleBoard rows={visibleRows} sort={sort} onSort={sortBy} onEdit={openEditor} onRestore={vehicle => updateDeletion(vehicle, false)} busy={busy} />
      {!rows.length && <div className="admin-empty"><Car size={theme.iconSize.lg} aria-hidden="true" /><strong>조건에 맞는 차량이 없어요.</strong><p>검색어를 변경하거나 지운 뒤 검색해 주세요.</p></div>}
      <Pagination page={currentPage - 1} totalPages={pageCount} ariaLabel="차량 목록 페이지" onChange={next => { setPage(next + 1); }} />
      <div className="vehicle-board-footer"><button type="button" className="admin-text-button" onClick={() => { setTrash(!trash); resetSearch(); setActionError(''); }}>{trash ? '차량 목록으로 돌아가기' : '삭제된 차량 보기'}</button></div>
    </section>{notice && <p className="vehicle-management-notice" role="status">{notice}</p>}
  </div>;
}
