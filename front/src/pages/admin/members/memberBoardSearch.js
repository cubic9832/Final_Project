// The existing API applies nickname/email and role conditions before server pagination.
export function memberBoardSearch(value) {
  let role = '';
  const keyword = value.trim().replace(/(^|\s)(총관리자|일반\s*회원|관리자)(?=\s|$)/gu, (match, space, label) => {
    const next = label === '총관리자' ? 'SUPER_ADMIN' : label === '관리자' ? 'ADMIN' : 'USER';
    if (role && role !== next) throw new Error('권한은 한 번에 하나씩 검색해 주세요.');
    role = next;
    return space;
  }).trim().replace(/\s+/gu, ' ');
  return { keyword, role };
}
