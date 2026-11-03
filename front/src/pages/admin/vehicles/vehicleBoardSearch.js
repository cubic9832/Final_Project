
// 공백으로 나눈 검색어가 모두 맞아야 한다. 휴지통과 일반 목록의 범위는 유지한다.
export function filterVehicleRows(vehicles, keyword, trash = false) {
  const terms = keyword.trim().toLocaleLowerCase('ko-KR').split(/\s+/u).filter(Boolean);
  return vehicles.filter(vehicle => {
    if ((vehicle.status === '삭제됨') !== trash) return false;
    const text = [vehicle.brand, vehicle.model, vehicle.trim, vehicle.fuel, vehicle.status, vehicle.origin, vehicle.year]
      .filter(value => value != null).join(' ').toLocaleLowerCase('ko-KR').replace(/\s+/gu, '');
    return terms.every(term => text.includes(term));
  });
}
