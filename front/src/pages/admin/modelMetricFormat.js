// 모델 관리: 비교 지표 표시 (모델 비교 표 · 트래픽 분배 카드 · 모델 상세가 같은 값을 같은 모양으로 보여 준다)

export const percent = (value) => (value == null ? '-' : `${(value * 100).toFixed(1)}%`);
export const count = (value) => (value == null ? '-' : value.toLocaleString('ko-KR'));
export const logLoss = (value) => (value == null ? '-' : value.toFixed(4));

// 기준(선형 모델 · 이전 모델) 대비 정확도 차이 (%p). 값이 없으면 '-'
export function baselineGap(row) {
  if (row.testAccuracy == null || row.baselineAccuracy == null) return '-';
  const gap = (row.testAccuracy - row.baselineAccuracy) * 100;
  return `${gap >= 0 ? '+' : ''}${gap.toFixed(1)}%p`;
}
