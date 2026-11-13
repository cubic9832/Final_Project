import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelPoller } from './modelPolling.js';

const starting = { models: [{ serverState: 'STARTING' }] };
const ready = { models: [{ serverState: 'RUNNING' }] };
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let index = 0; index < 5; index += 1) await Promise.resolve(); };

function clock() {
  let now = 0;
  let id = 0;
  const jobs = new Map();
  return { schedule: (action, delay) => { const key = ++id; jobs.set(key, { action, time: now + delay }); return key; },
    cancel: key => jobs.delete(key), tick: async amount => {
      now += amount;
      for (const [key, job] of [...jobs]) if (job.time <= now) { jobs.delete(key); void job.action(); }
      await flush();
    }, pending: () => jobs.size };
}

test('5초 걸리는 모델 조회는 취소하지 않고 완료한 뒤 3초 후 다음 조회한다', async () => {
  const timers = clock();
  const slow = deferred();
  const received = [];
  const signals = [];
  const poller = createModelPoller({ ...timers, load: signal => { signals.push(signal); return signals.length === 1 ? starting : slow.promise; },
    onData: value => received.push(value), onError: error => assert.fail(error.message) });
  await poller.refresh();
  await timers.tick(3000);
  assert.equal(signals.length, 2);
  await timers.tick(5000);
  assert.equal(signals.length, 2);
  assert.equal(signals[1].aborted, false);
  assert.equal(timers.pending(), 0);
  slow.resolve(starting); await flush();
  await timers.tick(2999); assert.equal(signals.length, 2);
  await timers.tick(1); assert.equal(signals.length, 3);
  assert.equal(received.length, 3);
  poller.stop();
});

test('STARTING 재조회 실패 후 다시 예약하고 정상 상태가 되면 자동 조회를 멈춘다', async () => {
  const timers = clock();
  let calls = 0;
  let failures = 0;
  const values = [];
  const poller = createModelPoller({ ...timers, load: async () => {
    calls += 1; if (calls === 2) throw new Error('network'); return calls === 1 ? starting : ready;
  }, onData: value => values.push(value), onError: () => { failures += 1; } });
  await poller.refresh();
  await timers.tick(3000); assert.equal(failures, 1);
  await timers.tick(3000); assert.deepEqual(values, [starting, ready]);
  await timers.tick(30000); assert.equal(calls, 3);
  poller.stop();
});

test('수동 갱신은 진행 중 요청 뒤 한 번만 실행하고 화면 이탈 시 응답과 타이머를 정리한다', async () => {
  const timers = clock();
  const slow = deferred();
  let calls = 0;
  let signal;
  const values = [];
  const poller = createModelPoller({ ...timers, load: input => { signal = input; calls += 1; return slow.promise; }, onData: value => values.push(value), onError: () => assert.fail('unexpected error') });
  void poller.refresh(); void poller.refresh(); void poller.refresh();
  assert.equal(calls, 1);
  slow.resolve(starting); await flush(); assert.equal(calls, 2);
  poller.stop(); assert.equal(signal.aborted, true); assert.equal(timers.pending(), 0);
  await timers.tick(30000); assert.equal(calls, 2);
});

test('화면 이탈 뒤 늦게 도착한 모델 응답은 반영하거나 다음 조회를 예약하지 않는다', async () => {
  const timers = clock();
  const slow = deferred();
  const values = [];
  const poller = createModelPoller({ ...timers, load: () => slow.promise, onData: value => values.push(value), onError: () => assert.fail('unexpected error') });
  void poller.refresh();
  poller.stop();
  slow.resolve(starting); await flush();
  assert.deepEqual(values, []);
  assert.equal(timers.pending(), 0);
});
