import AdminDataTable from '../components/AdminDataTable.jsx';
import './VehicleBoard.css';
import { formatVehiclePrice } from '../formatVehiclePrice.js';
const tableColumns = [
  { key: 'number', label: '번호', width: 8 }, { key: 'vehicle', label: '차량·트림', width: 31, align: 'left' },
  { key: 'year', label: '연식', width: 10 }, { key: 'fuel', label: '연료', width: 11 },
  { key: 'price', label: '판매 가격', width: 15 }, { key: 'status', label: '관리 상태', width: 15 },
  { key: 'manage', label: '관리', width: 10, sortable: false },
];
export default function VehicleBoard({ rows, sort, onSort, onEdit, onRestore, busy }) {
  return <AdminDataTable className="vehicle-board" caption="관리 차량 목록" columns={tableColumns} minWidth="900px" sort={sort} onSort={onSort}>
    {rows.map(vehicle => <tr key={vehicle.id}>
      <td>{vehicle.listNumber}</td><td className="admin-table-text">{vehicle.status === '삭제됨' ? <div className="vehicle-board-subject">{vehicle.brand} {vehicle.model}<span>{vehicle.trim || '트림 미입력'}</span></div> : <button type="button" className="vehicle-board-subject" onClick={() => onEdit(vehicle)}>{vehicle.brand} {vehicle.model}<span>{vehicle.trim || '트림 미입력'}</span></button>}</td>
      <td>{vehicle.year || '미입력'}</td><td>{vehicle.fuel || '미입력'}</td><td>{formatVehiclePrice(vehicle.price)}</td><td><span className={'admin-status ' + (vehicle.status === '공개' ? 'is-ok' : vehicle.status === '검수 대기' ? 'is-check' : 'is-neutral')}>{vehicle.status}</span></td>
      <td><button type="button" className="admin-text-button" disabled={busy} onClick={() => vehicle.status === '삭제됨' ? onRestore(vehicle) : onEdit(vehicle)}>{vehicle.status === '삭제됨' ? '복구' : '수정'}</button></td>
    </tr>)}
  </AdminDataTable>;
}
