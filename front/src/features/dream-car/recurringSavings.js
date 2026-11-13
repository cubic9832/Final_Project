import { isSavingDate, shiftMonth } from './savingsProgress.js';

export function isRecurringRule(rule) {
  return rule && typeof rule.id === 'string' && ['day', 'week', 'month'].includes(rule.unit) && Number.isInteger(rule.interval) && rule.interval >= 1 && rule.interval <= 365 && isSavingDate(rule.startDate) && Number.isFinite(rule.amount) && rule.amount > 0 && rule.amount <= 100000000 && typeof rule.memo === 'string' && rule.memo.length <= 200 && typeof rule.enabled === 'boolean' && (!rule.skipThrough || isSavingDate(rule.skipThrough));
}
export function scheduledDate(rule, index) {
  if (rule.unit === 'month') {
    const month = shiftMonth(rule.startDate.slice(0, 7), index * rule.interval);
    const [year, monthNumber] = month.split('-').map(Number);
    const day = Math.min(Number(rule.startDate.slice(8)), new Date(Date.UTC(year, monthNumber, 0)).getUTCDate());
    return `${month}-${String(day).padStart(2, '0')}`;
  }
  const date = new Date(`${rule.startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + index * rule.interval * (rule.unit === 'week' ? 7 : 1));
  return date.toISOString().slice(0, 10);
}
export function applyRecurringSavings(plan, asOfDate) {
  const records = [...(plan.records || [])];
  const rule = plan.recurringRules?.at(-1);
  if (!rule) return plan;
  if (!isRecurringRule(rule)) throw new Error('정기 기록 설정을 확인해 주세요.');
  if (!rule.enabled) return plan;
  const recordedDates = new Set(
    [...records.map(record => record.id), ...(plan.deletedRecurringIds || [])]
      .filter(id => id.startsWith('recurring:'))
      .map(id => id.slice(-10)),
  );
  for (let index = 0; index < 100000; index++) {
    const date = scheduledDate(rule, index);
    if (date > asOfDate) break;
    if (date < (plan.startDate || `${plan.startMonth}-01`) || rule.skipThrough && date <= rule.skipThrough) continue;
    if (recordedDates.has(date)) continue;
    const id = `recurring:${rule.id}:${date}`;
    records.push({ id, date, amount: rule.amount, memo: rule.memo, scheduleId: rule.id });
  }
  return records.length === (plan.records || []).length ? plan : { ...plan, records };
}
export function saveRecurringRule(plan, rule, asOfDate) {
  if (!isRecurringRule(rule) || rule.startDate < (plan.startDate || `${plan.startMonth}-01`)) throw new Error('시작일·금액·반복 간격을 확인해 주세요. 금액은 0보다 커야 합니다.');
  if ((plan.recurringRules || []).some(item => item.id === rule.id)) throw new Error('이미 등록된 설정입니다.');
  const previousDay = new Date(`${asOfDate}T00:00:00Z`);
  previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  const nextRule = plan.recurringRules?.length ? { ...rule, skipThrough: previousDay.toISOString().slice(0, 10) } : rule;
  return applyRecurringSavings({ ...plan, recurringRules: [nextRule] }, asOfDate);
}
export function toggleRecurringRule(plan, id, asOfDate) {
  const applied = applyRecurringSavings(plan, asOfDate);
  const rule = applied.recurringRules?.at(-1);
  if (rule?.id !== id) return applied;
  return { ...applied, recurringRules: [{ ...rule, enabled: !rule.enabled, ...(!rule.enabled ? { skipThrough: asOfDate } : {}) }] };
}
