import { dreamCarStorageKey } from '../dream-car/dreamCarStorage.js';
import { useEffect } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import useNotificationStore from './useNotificationStore';
import { getNotifications, getNotificationPreferences, recordSavingsEvent } from './notificationApi';
import { currentDate, progressStorageKey } from '../dream-car/savingsProgress';
import { applyRecurringSavings } from '../dream-car/recurringSavings';
import { savingsNotificationEvents } from '../dream-car/savingsNotificationEvents';
import { purchasePlanUpdatedEvent } from '../dream-car/purchasePlanSync';

export default function useSavingsNotifications(memberId) {
  const accessToken = useAuthStore(state => state.accessToken);
  useEffect(() => {
    if (!memberId || !accessToken) return;
    const controller = new AbortController();
    const { signal } = controller;
    let scanning = false;
    let reconnect;
    const key = `savings-notification-events:${memberId}`;
    async function reload() {
      const [items, preferences] = await Promise.all([getNotifications(signal), getNotificationPreferences(signal)]);
      if (!signal.aborted) useNotificationStore.setState({ notifications: items, preferences, error: '' });
    }
    function failed() {
      if (!signal.aborted) useNotificationStore.setState({ error: '알림 연결을 확인하고 있어요. 잠시 후 다시 시도합니다.' });
    }
    async function scan() {
      if (signal.aborted || scanning) return;
      scanning = true;
      try {
        const raw = localStorage.getItem(dreamCarStorageKey(progressStorageKey, memberId));
        if (!raw) return;
        const plans = JSON.parse(raw);
        if (!Array.isArray(plans)) throw new Error('Invalid savings plans');
        const stored = localStorage.getItem(key);
        const acknowledged = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(acknowledged)) throw new Error('Invalid notification cursor');
        const today = currentDate();
        // 최초 접속 이전의 정기 기록은 과거 알림으로 대량 발송하지 않는다.
        const { baseline } = savingsNotificationEvents(plans, acknowledged, today, !stored);
        const cursor = [...acknowledged, ...baseline];
        if (!stored) localStorage.setItem(key, JSON.stringify(cursor));
        const updated = plans.map(plan => applyRecurringSavings(plan, today));
        const { events } = savingsNotificationEvents(updated, cursor, today);
        if (updated.some((plan, index) => plan !== plans[index])) {
          localStorage.setItem(dreamCarStorageKey(progressStorageKey, memberId), JSON.stringify(updated));
          window.dispatchEvent(new Event(purchasePlanUpdatedEvent));
        }
        for (const event of events) {
          await recordSavingsEvent(event, signal);
          if (signal.aborted) return;
          cursor.push(event.eventKey);
          localStorage.setItem(key, JSON.stringify(cursor));
        }
        if (events.length) await reload();
      } catch { failed(); }
      finally { scanning = false; }
    }
    async function connect() {
      let reader;
      try {
        // 일반 API 경로에서 토큰 재발급 후, Authorization 헤더로 SSE 연결한다.
        await reload();
        if (signal.aborted) return;
        const token = useAuthStore.getState().accessToken;
        const response = await fetch('/api/v1/notifications/stream', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal,
        });
        if (!response.ok || !response.body) throw new Error('Notification stream unavailable');
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replaceAll('\r\n', '\n');
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (/^event:\s*(ready|changed)\s*$/m.test(frame)) await reload();
          }
        }
      } catch { failed(); }
      finally {
        if (reader) await reader.cancel().catch(() => {});
        if (!signal.aborted) reconnect = setTimeout(connect, 3000);
      }
    }
    connect();
    scan();
    const timer = setInterval(scan, 5000);
    window.addEventListener('focus', scan);
    window.addEventListener('storage', scan);
    window.addEventListener(purchasePlanUpdatedEvent, scan);
    return () => {
      controller.abort(); clearTimeout(reconnect); clearInterval(timer);
      window.removeEventListener('focus', scan);
      window.removeEventListener('storage', scan);
      window.removeEventListener(purchasePlanUpdatedEvent, scan);
      useNotificationStore.setState({ notifications: [], error: '' });
    };
  }, [memberId, accessToken]);
}
