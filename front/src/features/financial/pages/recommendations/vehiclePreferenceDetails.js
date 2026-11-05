const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

export function seatingDescription(seats, options, fallback) {
  const capacity = numeric(seats);
  const capacities = [...new Set((Array.isArray(options) ? options : []).map(numeric)
    .filter(value => Number.isInteger(value) && value > 0))].sort((a, b) => a - b);
  if (capacities.length > 1) return `${capacities.join('·')}명 구성`;
  if (Number.isInteger(capacity) && capacity > 0) return `${capacity}명`;
  if (capacities.length) return `${capacities.join('·')}명 구성`;
  if (typeof seats === 'string' && seats.startsWith('2+')) return '2+ 좌석';
  return fallback || '정보 준비 중';
}

export function accelerationDescription(seconds, score, evidence) {
  const time = numeric(seconds);
  // 합성 학습용 초 단위를 실제 차량의 측정 제원으로 표시하지 않는다.
  const synthetic = /estimated|synthetic|prior/i.test(`${evidence?.kind || ''} ${evidence?.method || ''}`);
  if (time !== null && time > 0 && !synthetic) return ['가속 성능', `0–100km/h 약 ${time}초`];
  const value = numeric(score);
  if (value !== null && value >= 0 && value <= 1) return ['가속 성향', value < .25 ? '부드럽고 완만한 가속' : value < .75 ? '균형 잡힌 가속' : '강하고 빠른 가속'];
  return ['가속 성능', '정보 준비 중'];
}
