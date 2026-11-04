
// 관리자 차량 가격의 입력 단위는 만 원이며, 저장 값과 정렬 값은 바꾸지 않는다.
export function formatVehiclePrice(value) {
  if (value === '' || value == null) return '미입력';
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return '미입력';
  const format = number => number.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  if (amount < 10000) return format(amount) + '만 원';
  const billions = Math.floor(amount / 10000);
  const remainder = Number((amount % 10000).toFixed(4));
  return format(billions) + '억' + (remainder ? ' ' + format(remainder) + '만 원' : ' 원');
}
