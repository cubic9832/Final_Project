import { candidateMoney } from './candidatePresentation.js';

const tasteDescriptions = {
  sportiness: ['높고 직립한 디자인', '균형 잡힌 디자인', '낮고 날렵한 디자인'],
  angularity: ['둥글고 부드러운 윤곽', '직선과 곡선이 섞인 윤곽', '각지고 또렷한 윤곽'],
  acceleration: ['완만한 가속', '균형 잡힌 가속', '빠른 가속'],
};

export function buildDetailReasons(view, candidates, preferences = {}) {
  const { candidate, matches, mismatches, financial } = view;
  const { vehicle, cost } = candidate;
  const reasons = [...matches, ...mismatches]
    .filter(item => tasteDescriptions[item.key] && Number.isFinite(item.requested))
    .sort((a, b) => Number(b.status === 'match') - Number(a.status === 'match') || b.weight - a.weight)
    .slice(0, 2)
    .map(item => {
      const descriptions = tasteDescriptions[item.key];
      const describe = value => descriptions[value < .25 ? 0 : value < .75 ? 1 : 2];
      const relation = item.status === 'match' ? '선호에 가까워요' : '선호와 차이가 있어요';
      return { title: item.label, text: `선택하신 성향은 ‘${describe(item.requested)}’이에요. 이 차량은 ‘${describe(item.actual)}’에 가까운 것으로 평가돼 ${relation}.` };
    });

  const conditions = matches.filter(item => !tasteDescriptions[item.key]).slice(0, 2);
  if (conditions.length) {
    reasons.push({ title: '내 이용 조건', text: conditions.map(item => item.text).join(' ') });
  }

  const monthlyCost = cost.monthly_running_cost;
  const peer = candidates.find(item =>
    item.vehicle.model !== vehicle.model
    && Number.isFinite(item.cost.monthly_running_cost)
    && item.cost.monthly_running_cost - monthlyCost >= 0.1
  );
  if (Number.isFinite(monthlyCost)) {
    const priority = Number(preferences.runningCostImportance) >= 4
      ? '유지비 절약을 중요하게 고르셨어요. ' : '';
    const comparison = peer
      ? `추천 후보인 ${peer.vehicle.model}보다 매달 약 ${candidateMoney(peer.cost.monthly_running_cost - monthlyCost)} 적게 들어 유지비 부담을 줄일 수 있어요.`
      : '입력하신 월 예산에서 이만큼을 유지비로 예상해요.';
    reasons.push({ title: '매달 드는 비용', text: `${priority}예상 월 유지비는 ${candidateMoney(monthlyCost)}예요. ${comparison}` });
  }
  if (Number.isFinite(financial?.cashAfterPurchase)) {
    const priority = Number(preferences.assetRetentionImportance) >= 4
      ? '구매 후 목돈을 최대한 남기고 싶다고 하셨어요. ' : '';
    reasons.push({ title: '구매 후 자금', text: `${priority}이 차량을 구매하면 목돈이 ${candidateMoney(financial.cashAfterPurchase)} 남는 것으로 계산돼요.` });
  }
  return reasons;
}
