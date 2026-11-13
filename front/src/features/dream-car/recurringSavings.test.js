import test from 'node:test';
import assert from 'node:assert/strict';
import { saveRecurringRule, applyRecurringSavings, scheduledDate, toggleRecurringRule } from './recurringSavings.js';
import { calculateSavingsProgress, deleteSavingRecord, recordDailySaving, recordMonthlySaving } from './savingsProgress.js';

const plan = { id: 'p', startMonth: '2026-01', startDate: '2026-01-01', initialSavings: 1000, monthlySaving: 100, targetMonths: 36, target: 5000, entries: {} };
const rule = { id: 'r', unit: 'month', interval: 1, startDate: '2026-01-31', amount: 100, memo: '자동이체', enabled: true };
test('월말 반복은 짧은 달 말일을 사용하고 이후 원래 일자로 돌아온다', () => {
  assert.equal(scheduledDate(rule, 1), '2026-02-28');
  assert.equal(scheduledDate(rule, 2), '2026-03-31');
  const result = saveRecurringRule(plan, rule, '2026-03-31');
  assert.deepEqual(result.records.map(record => record.date), ['2026-01-31', '2026-02-28', '2026-03-31']);
  assert.equal(calculateSavingsProgress(result, '2026-03').total, 1300);
  assert.strictEqual(applyRecurringSavings(result, '2026-03-31'), result);
});
test('매일·매주 간격은 월 경계에서도 유지하고 미래 기록은 추가하지 않는다', () => {
  const daily = { ...rule, unit: 'day', interval: 2 };
  assert.equal(scheduledDate(daily, 1), '2026-02-02');
  assert.equal(saveRecurringRule(plan, daily, '2026-02-02').records.length, 2);
  assert.equal(scheduledDate({ ...rule, unit: 'week', interval: 2 }, 1), '2026-02-14');
  assert.equal(saveRecurringRule(plan, rule, '2026-01-15').records, undefined);
});
test('일시중지 후 재개는 중지한 기간의 기록을 소급해 생성하지 않는다', () => {
  const started = saveRecurringRule(plan, rule, '2026-01-31');
  const paused = toggleRecurringRule(started, rule.id, '2026-01-31');
  assert.equal(applyRecurringSavings(paused, '2026-03-31').records.length, 1);
  const resumed = toggleRecurringRule(paused, rule.id, '2026-03-31');
  const result = applyRecurringSavings(resumed, '2026-04-30');
  assert.deepEqual(result.records.map(record => record.date), ['2026-01-31', '2026-04-30']);
});
test('자동 기록을 수정해도 다시 열 때 원래 금액이 중복 생성되지 않는다', () => {
  const original = saveRecurringRule(plan, rule, '2026-01-31');
  const edited = recordDailySaving(original, '2026-01-30', 90, '실제 입금액 수정', '2026-01-31', 'unused', original.records[0].id);
  const updated = applyRecurringSavings(edited, '2026-01-31');
  assert.equal(updated.records.length, 1);
  assert.equal(updated.records[0].amount, 90);
  assert.equal(updated.records[0].scheduleId, 'r');
});
test('잘못된 간격·금액·계획 이전 시작일은 저장하지 않는다', () => {
  for (const patch of [{ interval: 0 }, { interval: 1.5 }, { amount: 0 }, { amount: NaN }, { startDate: '2025-12-31' }]) assert.throws(() => saveRecurringRule(plan, { ...rule, ...patch }, '2026-03-01'));
});

test('자동 기록 삭제 후 재방문해도 재생성하지 않으며 다음 예정일은 유지한다', () => {
  const original = saveRecurringRule(plan, rule, '2026-02-28');
  const deleted = deleteSavingRecord(original, original.records[0].id);
  const next = applyRecurringSavings(deleted, '2026-03-31');
  assert.deepEqual(next.records.map(record => record.date), ['2026-02-28', '2026-03-31']);
  assert.equal(calculateSavingsProgress(next, '2026-03').total, 1200);
});

test('수동·기존 월별 기록 삭제는 다른 기록과 시작 자금을 유지한다', () => {
  const daily = recordDailySaving(plan, '2026-01-05', 50, '', '2026-01-31', 'daily');
  const mixed = recordMonthlySaving(daily, '2026-01', 20, '', '2026-01');
  const afterDaily = deleteSavingRecord(mixed, 'daily');
  assert.equal(calculateSavingsProgress(afterDaily, '2026-01').total, 1020);
  const afterLegacy = deleteSavingRecord(afterDaily, 'legacy-2026-01');
  assert.equal(calculateSavingsProgress(afterLegacy, '2026-01').total, 1000);
  assert.equal(calculateSavingsProgress(afterLegacy, '2026-01').monthlyGap, null);
  assert.throws(() => deleteSavingRecord(afterLegacy, 'missing'));
});

test('기존 설정이 여러 개면 최근 설정만 실행하고 새 설정은 과거 기록을 중복 생성하지 않는다', () => {
  const initial = saveRecurringRule(plan, rule, '2026-01-31');
  const latest = { ...rule, id: 'latest', amount: 200, startDate: '2026-02-28' };
  const legacy = { ...initial, recurringRules: [rule, latest] };
  const applied = applyRecurringSavings(legacy, '2026-02-28');
  assert.deepEqual(applied.records.map(record => record.amount), [100, 200]);

  const replacement = { ...latest, id: 'replacement', amount: 300 };
  const saved = saveRecurringRule(applied, replacement, '2026-02-28');
  assert.deepEqual(saved.recurringRules.map(item => item.id), ['replacement']);
  assert.deepEqual(saved.records, applied.records);
  assert.deepEqual(applyRecurringSavings(saved, '2026-03-28').records.map(record => record.amount), [100, 200, 300]);
});

test('설정을 교체하면 오늘 예정된 기록을 즉시 저장하고 다시 저장해도 중복되지 않는다', () => {
  const today = '2026-02-15';
  const initial = saveRecurringRule(plan, rule, '2026-01-31');
  const replacement = { ...rule, id: 'replacement', startDate: today };
  const saved = saveRecurringRule(initial, replacement, today);
  assert.deepEqual(saved.records.map(record => record.date), ['2026-01-31', today]);

  const anotherRule = { ...replacement, id: 'another' };
  assert.deepEqual(saveRecurringRule(saved, anotherRule, today).records, saved.records);

  const deleted = deleteSavingRecord(saved, saved.records.at(-1).id);
  assert.deepEqual(saveRecurringRule(deleted, anotherRule, today).records, deleted.records);
});
