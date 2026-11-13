const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
export const ADMIN_PAGE_SIZE = 20;

export function nextTableSort(current, column) {
  if (current.column !== column) return { column, direction: 'ASC' };
  return current.direction === 'ASC'
    ? { column, direction: 'DESC' }
    : { column: '', direction: 'ASC' };
}

// 화면은 표시 값의 추출 방법만 정의한다. 빈 값은 양 방향 모두 뒤로 보낸다.
export function sortTableRows(rows, sort, values) {
  const valueOf = values[sort.column];
  if (!valueOf) return rows;
  return [...rows].sort((left, right) => {
    const a = valueOf(left), b = valueOf(right);
    const tie = right.listNumber - left.listNumber;
    if (a == null && b == null) return tie;
    if (a == null) return 1;
    if (b == null) return -1;
    const compared = typeof a === 'number' ? a - b : collator.compare(a, b);
    return (sort.direction === 'ASC' ? compared : -compared) || tie;
  });
}

// 페이지 번호는 Pagination 컴포넌트와 동일하게 0부터 시작한다.
export function paginateTableRows(rows, page, size = ADMIN_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(Math.max(page, 0), totalPages - 1);
  return { page: currentPage, totalPages, rows: rows.slice(currentPage * size, (currentPage + 1) * size) };
}
