import './Pagination.css';

// page는 0부터 시작하며, 번호는 최대 5개·이전/다음은 5페이지씩 이동한다.
export default function Pagination({ page, totalPages, onChange, ariaLabel = '목록 페이지' }) {
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const end = Math.min(totalPages - 1, start + 4);
  const pages = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  return <nav className="pagination" aria-label={ariaLabel}>
    {page > 0 && <button type="button" onClick={() => onChange(0)}>처음</button>}
    {page > 0 && <button type="button" aria-label="최대 5페이지 이전으로" onClick={() => onChange(Math.max(0, page - 5))}>이전</button>}
    {pages.map((number) => <button type="button" key={number} aria-current={page === number ? 'page' : undefined} aria-label={`${number + 1}페이지`} onClick={() => onChange(number)}>{number + 1}</button>)}
    {page < totalPages - 1 && <button type="button" aria-label="최대 5페이지 다음으로" onClick={() => onChange(Math.min(totalPages - 1, page + 5))}>다음</button>}
    {page < totalPages - 1 && <button type="button" onClick={() => onChange(totalPages - 1)}>마지막</button>}
  </nav>;
}
