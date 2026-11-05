import AdminDataTable from '../components/AdminDataTable.jsx';
import AdminDetailRow from '../components/AdminDetailRow.jsx';

import { Fragment } from 'react';
import { Car, Copy, Pencil, Trash2 } from 'lucide-react';
import theme from '../../../styles/theme';
import './VehicleBoard.css';
import { formatVehiclePrice } from '../formatVehiclePrice.js';

const tableColumns = [
  { key: 'number', label: '번호', width: 8 },
  { key: 'vehicle', label: '차량·트림', width: 31, align: 'left' },
  { key: 'year', label: '연식', width: 10 },
  { key: 'fuel', label: '연료', width: 11 },
  { key: 'price', label: '판매 가격', width: 15 },
  { key: 'status', label: '관리 상태', width: 15 },
  { key: 'detail', label: '상세', width: 10, sortable: false },
];

export default function VehicleBoard({ rows, sort, onSort, expandedId, onExpand, onEdit, onDelete, onRestore, busy }) {
  return <AdminDataTable className="vehicle-board" caption="관리 차량 목록" columns={tableColumns} minWidth="900px" sort={sort} onSort={onSort}>
    {rows.map(vehicle => {
      const open = expandedId === vehicle.id;
      const name = [vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(' ');
      const toggle = () => onExpand(open ? null : vehicle.id);
      const details = [
        ['차체 형태', vehicle.body], ['국산·수입', vehicle.origin], ['구동 방식', vehicle.drive],
        ['연비', vehicle.efficiency ? vehicle.efficiency + (vehicle.fuel === '전기' ? ' km/kWh' : ' km/L') : '미입력'],
        ['승차 정원', vehicle.seats ? vehicle.seats + '명' : '미입력'], ['전장', vehicle.length ? Number(vehicle.length).toLocaleString('ko-KR') + ' mm' : '미입력'],
        ['자료 출처', vehicle.source || '미입력'], ['확인일', vehicle.checkedOn || '미입력'], ['최종 수정', vehicle.updatedAt?.slice(0, 10) || '미입력'],
      ];
      return <Fragment key={vehicle.id}><tr className={open ? 'vehicle-board-selected' : ''}>
        <td>{vehicle.listNumber}</td><td className="admin-table-text"><button type="button" className="vehicle-board-subject" aria-expanded={open} aria-controls={'vehicle-board-detail-' + vehicle.id} onClick={toggle}>{vehicle.brand} {vehicle.model}<span>{vehicle.trim || '트림 미입력'}</span></button></td>
        <td>{vehicle.year || '미입력'}</td><td>{vehicle.fuel || '미입력'}</td><td>{formatVehiclePrice(vehicle.price)}</td><td><span className={'admin-status ' + (vehicle.status === '공개' ? 'is-ok' : vehicle.status === '검수 대기' ? 'is-check' : 'is-neutral')}>{vehicle.status}</span></td>
        <td><button type="button" className="admin-text-button" aria-expanded={open} aria-controls={'vehicle-board-detail-' + vehicle.id} aria-label={name + (open ? ' 상세 접기' : ' 상세 보기')} onClick={toggle}>{open ? '접기' : '보기'}</button></td>
      </tr><AdminDetailRow open={open} colSpan={tableColumns.length} className="vehicle-board-detail-cell"><section className="vehicle-board-detail" id={'vehicle-board-detail-' + vehicle.id} aria-label={name + ' 상세'}>
        <div className="vehicle-board-detail-main"><div className="vehicle-board-image">{vehicle.image ? <img src={vehicle.image} alt={name} loading="lazy" /> : <Car size={theme.iconSize.lg} aria-label="등록된 차량 이미지 없음" />}</div><div><h4>{vehicle.brand} {vehicle.model}</h4><p className="vehicle-board-trim">{vehicle.trim}</p><dl className="vehicle-board-specs">{details.map(([label, value]) => <div key={label} className={label === '자료 출처' ? 'vehicle-board-spec-source' : undefined}><dt>{label}</dt><dd>{value || '미입력'}</dd></div>)}</dl></div></div>
        {vehicle.sourceUrl && <p className="vehicle-board-source">출처 주소: {vehicle.sourceUrl}</p>}
        {vehicle.memo && <div className="vehicle-board-memo"><h4>관리 메모</h4><p>{vehicle.memo}</p></div>}
        <div className="vehicle-management-row-actions">{vehicle.status !== '삭제됨' ? <><button type="button" className="admin-outline-button" onClick={() => onEdit(vehicle)}><Pencil size={theme.iconSize.sm} aria-hidden="true" />수정</button><button type="button" className="admin-outline-button" onClick={() => onEdit(vehicle, true)}><Copy size={theme.iconSize.sm} aria-hidden="true" />복제해서 등록</button><button type="button" className="admin-outline-button" disabled={busy} onClick={() => onDelete(vehicle)}><Trash2 size={theme.iconSize.sm} aria-hidden="true" />삭제</button></> : <button type="button" className="admin-outline-button" disabled={busy} onClick={() => onRestore(vehicle)}>복구</button>}</div>
      </section></AdminDetailRow></Fragment>;
    })}
  </AdminDataTable>;
}
