// 서버가 보낸 날짜 문자열을 표시한다. 브라우저 시간대로 재해석하지 않는다.
export const formatAdminDate = (value, empty = '—') => value ? value.slice(0, 10) : empty;
export const formatAdminDateTime = (value, empty = '—') => value ? value.replace('T', ' ').slice(0, 19) : empty;
