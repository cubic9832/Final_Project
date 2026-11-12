// 완료 후 다음 조회를 예약한다. 수동 새로고침은 진행 중 요청을 취소하지 않고 한 번 모아서 실행한다.
export function createModelPoller({ load, onData, onError, delay = 3000,
  schedule = setTimeout, cancel = clearTimeout }) {
  const controller = new AbortController();
  let latest;
  let running = false;
  let queued = false;
  let timer;
  async function refresh() {
    if (controller.signal.aborted) return;
    cancel(timer);
    if (running) { queued = true; return; }
    running = true;
    try {
      const data = await load(controller.signal);
      if (!controller.signal.aborted) { latest = data; onData(data); }
    } catch (error) {
      if (!controller.signal.aborted) onError(error);
    } finally {
      running = false;
      if (!controller.signal.aborted) {
        if (queued) { queued = false; void refresh(); }
        else if (latest?.models.some(row => row.serverState === 'STARTING')) timer = schedule(refresh, delay);
      }
    }
  }
  function stop() { controller.abort(); cancel(timer); }
  return { refresh, stop };
}
