import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressPlan, recordDailySaving } from './savingsProgress.js';
import { saveRecurringRule } from './recurringSavings.js';
import { savingsNotificationEvents } from './savingsNotificationEvents.js';

const today = '2026-11-04';
const base = () => createProgressPlan({ id: 'car', brand: '현대', model: '목표차', trim: '기본' },
  { savings: 100, monthlySaving: 10, targetMonths: 10 }, 200, today, 'plan');

test('목표 금액 직전에는 알림이 없고 정확히 도달하면 계획당 한 번만 알린다', () => {
  let plan = recordDailySaving(base(), today, 99.99, '', today, 'record');
  assert.deepEqual(savingsNotificationEvents([plan], [], today).events, []);
  plan = recordDailySaving(plan, today, 0.01, '', today, 'record2');
  const events = savingsNotificationEvents([plan], [], today).events;
  assert.equal(events[0].type, 'GOAL_REACHED');
  assert.deepEqual(savingsNotificationEvents([plan], events.map(x => x.eventKey), today).events, []);
  plan = recordDailySaving(plan, today, 20, '', today, 'record3');
  assert.deepEqual(savingsNotificationEvents([plan], ['goal:plan'], today).events, []);
});

test('정기 기록만 알리고 수동 기록과 미래 기록은 제외한다', () => {
  let plan = saveRecurringRule(base(), { id: 'rule', unit: 'month', interval: 1, startDate: today, amount: 10, memo: '', enabled: true }, today);
  plan = recordDailySaving(plan, today, 5, '', today, 'manual');
  plan.records.push({ id: 'future', scheduleId: 'rule', date: '2026-12-04', amount: 10, memo: '' });
  const events = savingsNotificationEvents([plan], [], today).events;
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'RECURRING_RECORDED');
  assert.equal(events[0].amount, 10);
  assert.deepEqual(savingsNotificationEvents([plan], [events[0].eventKey], today).events, []);
});

test('기존 정기 기록은 최초 연결 시 기준점으로 보존하고 새 기록부터 알린다', () => {
  const plan = saveRecurringRule(base(), { id: 'rule', unit: 'day', interval: 1, startDate: today, amount: 10, memo: '', enabled: true }, today);
  const initial = savingsNotificationEvents([plan], [], today, true);
  assert.equal(initial.baseline.length, 1);
  assert.equal(initial.events.length, 0);
  assert.deepEqual(savingsNotificationEvents([plan], initial.baseline, today).events, []);
});
