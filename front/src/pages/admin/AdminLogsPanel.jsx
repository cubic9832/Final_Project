// 7단계: 운영 로그 탭 (실제 데이터, V13 admin_audit_logs)
// 관리자 작업(권한 · 잠금 해제 · 상담 경고 · 제한 등) + 보완 13 메일 발송 기록(서버 자동). 이름은 지금 회원 정보에서 읽고, 탈퇴했으면 "탈퇴한 회원"
import { Fragment, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import theme from '../../styles/theme';
import { getAuditLogs } from '../../features/admin/adminApi';
import { ACTION_LABELS, describeLog, formatLogTime, logActor, logTarget } from './adminLogFormat';
import Pagination from '../../components/Pagination.jsx';
import AdminListHeader from './components/AdminListHeader.jsx';
import AdminDataTable from './components/AdminDataTable.jsx';
import AdminDetailRow from './components/AdminDetailRow.jsx';
import { ADMIN_PAGE_SIZE, nextTableSort } from './adminTableData.js';
import { formatAdminDate, formatAdminDateTime } from './adminDateFormat.js';
import './components/AdminListSummary.css';
import './AdminLogsPanel.css';

const columns = [
  { key: 'number', label: '번호', width: 7 },
  { key: 'action', label: '작업', width: 15 },
  { key: 'detail', label: '내용', width: 25, align: 'left' },
  { key: 'target', label: '대상', width: 14 },
  { key: 'actor', label: '작업자', width: 13 },
  { key: 'createdAt', label: '등록일', width: 18 },
  { key: 'expand', label: '상세', width: 8, sortable: false },
];
// 엑셀이 수식으로 읽는 글자(= + - @, 탭 · 줄바꿈)로 시작하면 앞에 ' 를 붙여 글자로만 보이게 한다
// (예: 닉네임 "=1+1" 이 엑셀에서 계산되거나, 악의적인 수식이 실행되지 않게 — CSV 수식 주입 방지)
const safeCell = (value) => {
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};

// 지금 화면에 보이는 기록만 CSV 로 내려받는다 (엑셀에서 한글이 깨지지 않게 BOM 을 붙인다)
function downloadCsv(logs) {
  const values = [
    ['시각', '관리자', '작업', '대상', '내용'],
    ...logs.map((log) => [formatLogTime(log.createdAt), logActor(log),
      ACTION_LABELS[log.action] ?? log.action, logTarget(log), describeLog(log)]),
  ];
  const csv = values.map((row) => row.map((value) => `"${safeCell(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'admin-audit-logs.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminLogsPanel() {
  const [query, setQuery] = useState({ page: 1, sort: '', direction: 'ASC' });
  const [state, setState] = useState({ status: 'loading', logs: [], meta: null, error: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getAuditLogs({ ...query, size: ADMIN_PAGE_SIZE }, controller.signal)
      .then(({ logs, meta }) => { if (!controller.signal.aborted) setState({ status: 'done', logs, meta, error: '' }); })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', logs: [], meta: null, error: error.response?.data?.error?.message ?? '운영 로그를 불러오지 못했습니다.' });
        }
      });
    return () => controller.abort();
  }, [query, reloadKey]);

  function changeQuery(next) {
    setExpandedId(null);
    setState((prev) => ({ ...prev, status: 'loading' }));
    setQuery((prev) => ({ ...prev, ...next }));
  }

  function sortBy(column) {
    const next = nextTableSort({ column: query.sort, direction: query.direction }, column);
    changeQuery({ page: 1, sort: next.column, direction: next.direction });
  }

  const { logs, meta } = state;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <section className="admin-card admin-log-panel">
      <AdminListHeader title="운영 이력">
        <button type="button" className="admin-outline-button" disabled={state.status !== 'done' || !logs.length} onClick={() => downloadCsv(logs)}>
          <Download size={theme.iconSize.sm} aria-hidden="true" />CSV 내보내기
        </button>
      </AdminListHeader>
      <p className="admin-log-help">권한 변경, 계정 관리, 상담 처리 및 추천 모델 관리 기록을 확인합니다.</p>

      {state.status === 'loading' && <p className="admin-empty" role="status">운영 로그를 불러오는 중…</p>}
      {state.status === 'error' && (
        <p className="admin-empty" role="alert">
          {state.error}{' '}
          <button type="button" className="admin-text-button" onClick={() => { changeQuery({}); setReloadKey((key) => key + 1); }}>
            다시 시도
          </button>
        </p>
      )}
      {state.status === 'done' && <>
        <AdminDataTable className="admin-log-table" caption="관리자 작업 기록" columns={columns} minWidth="1040px" sort={{ column: query.sort, direction: query.direction }} onSort={sortBy}>
          {logs.length === 0 ? <tr><td colSpan={columns.length} className="admin-log-empty">조건에 맞는 운영 기록이 없습니다.</td></tr> : logs.map(log => {
            const open = expandedId === log.id;
            const detailId = `admin-log-detail-${log.id}`;
            const toggle = () => setExpandedId(open ? null : log.id);
            return <Fragment key={log.id}>
              <tr className={open ? 'admin-log-selected' : ''}>
                <td>{log.listNumber ?? '—'}</td>
                <td>{ACTION_LABELS[log.action] ?? log.action}</td>
                <td className="admin-table-text"><button type="button" className="admin-log-subject" aria-expanded={open} aria-controls={detailId} onClick={toggle}><span className="admin-list-summary">{describeLog(log)}</span></button></td>
                <td>{logTarget(log)}</td><td>{logActor(log)}</td>
                <td><time dateTime={log.createdAt}>{formatAdminDate(log.createdAt)}</time></td>
                <td><button className="admin-text-button" type="button" aria-expanded={open} aria-controls={detailId} aria-label={`${ACTION_LABELS[log.action] ?? log.action} 상세 ${open ? '접기' : '보기'}`} onClick={toggle}>{open ? '접기' : '보기'}</button></td>
              </tr>
              <AdminDetailRow open={open} colSpan={columns.length}><section id={detailId} className="admin-log-detail" aria-label="운영 기록 상세">
                <h4>작업 내용</h4><p>{describeLog(log)}</p>
                <dl><div><dt>시각</dt><dd>{formatAdminDateTime(log.createdAt)}</dd></div><div><dt>작업자</dt><dd>{logActor(log)}</dd></div><div><dt>작업</dt><dd>{ACTION_LABELS[log.action] ?? log.action}</dd></div><div><dt>대상</dt><dd>{logTarget(log)}</dd></div></dl>
              </section></AdminDetailRow>
            </Fragment>;
          })}
        </AdminDataTable>
      </>}

      {state.status === 'done' && totalPages > 1 && <Pagination ariaLabel="운영 로그 페이지" page={query.page - 1} totalPages={totalPages} onChange={page => changeQuery({ page: page + 1 })} />}
    </section>
  );
}
