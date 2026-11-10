import './AdminListHeader.css';

// 검색 form과 업무별 버튼은 호출 화면이 소유한다.
export default function AdminListHeader({ title, children, className = '' }) {
  return <div className={`admin-list-header ${className}`}>
    <h3>{title}</h3>
    {children}
  </div>;
}
