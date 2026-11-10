import { ArrowDown, ArrowUp } from 'lucide-react';
import theme from '../../../styles/theme';
import './AdminDataTable.css';

// 데이터 조회와 정렬 실행은 화면이 담당하고, 이 컴포넌트는 표의 표현만 담당한다.
export default function AdminDataTable({ caption, columns, sort, onSort, className = '', minWidth, children }) {
  return <div className="admin-data-table-wrap">
    <table className={`admin-data-table ${className}`} style={{ '--admin-table-min-width': minWidth }}>
      <caption className="admin-sr-only">{caption}</caption>
      <colgroup>{columns.map(column => <col key={column.key} style={{ width: `${column.width}%` }} />)}</colgroup>
      <thead><tr>{columns.map(column => {
        const sortable = Boolean(onSort) && column.sortable !== false;
        const active = sortable && sort?.column === column.key;
        const Icon = sort?.direction === 'ASC' ? ArrowUp : ArrowDown;
        const next = active ? sort.direction === 'ASC' ? '내림차순 정렬' : '정렬 해제' : '오름차순 정렬';
        return <th key={column.key} scope="col" style={{ textAlign: column.align ?? 'center' }} aria-sort={sortable ? active ? sort.direction === 'ASC' ? 'ascending' : 'descending' : 'none' : undefined}>
          {sortable ? <button type="button" className="admin-data-table-sort" aria-label={`${column.label} ${next}`} onClick={() => onSort(column.key)}>
            {column.label}<span aria-hidden="true">{active && <Icon size={theme.iconSize.sm} />}</span>
          </button> : column.label}
        </th>;
      })}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>;
}
