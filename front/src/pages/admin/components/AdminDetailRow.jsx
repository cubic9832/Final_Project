// 상세 내용과 열림 상태는 호출 화면에서 전달한다. 닫힌 상세는 DOM에 남기지 않는다.
export default function AdminDetailRow({ open, colSpan, className = '', children }) {
  if (!open) return null;
  return <tr><td colSpan={colSpan} className={`admin-data-table-detail-cell ${className}`}>{children}</td></tr>;
}
