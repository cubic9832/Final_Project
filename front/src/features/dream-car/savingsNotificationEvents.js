import { calculateSavingsProgress, getSavingRecords, isProgressPlan } from './savingsProgress.js';

export function savingsNotificationEvents(plans, acknowledged, asOfDate, initialize = false) {
  const events = [];
  const baseline = [];
  for (const plan of plans) {
    if (!isProgressPlan(plan)) throw new Error('저축 계획 형식을 확인해 주세요.');
    const goalKey = `goal:${plan.id}`;
    if (calculateSavingsProgress(plan, asOfDate.slice(0, 7)).remaining === 0 && !acknowledged.includes(goalKey)) {
      events.push({ eventKey: goalKey, type: 'GOAL_REACHED', amount: plan.target });
    }
    for (const record of getSavingRecords(plan)) {
      if (!record.scheduleId || record.date > asOfDate) continue;
      const eventKey = `recurring:${plan.id}:${record.id}`;
      if (acknowledged.includes(eventKey)) continue;
      if (initialize) baseline.push(eventKey);
      else events.push({ eventKey, type: 'RECURRING_RECORDED', amount: record.amount });
    }
  }
  return { events, baseline };
}
