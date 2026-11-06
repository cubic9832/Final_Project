import { notificationTypeLabels } from '../notificationTypeLabels.js';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Bell, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useNotificationStore from '../useNotificationStore';
import theme from '../../../styles/theme';
import './NotificationBell.css';
import useSavingsNotifications from '../useSavingsNotifications';
import { getNotifications, getNotificationPreferences, readNotification, setNotificationPreference } from '../notificationApi';
import NotificationItem from './NotificationItem';

export default function NotificationBell({ memberId }) {
  useSavingsNotifications(memberId);
  const [settings, setSettings] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const preferences = useNotificationStore(state => state.preferences);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const panelId = useId();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  useLayoutEffect(() => {
    if (!open) return;
    function position() {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(400, window.innerWidth - 32);
      const top = Math.min(rect.bottom + 8, window.innerHeight - 160);
      Object.assign(panelRef.current.style, {
        width: `${width}px`, left: `${Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16))}px`,
        top: `${Math.max(16, top)}px`, maxHeight: `${window.innerHeight - Math.max(16, top) - 16}px`,
      });
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);
  const notifications = useNotificationStore(state => state.notifications);
  const markRead = useNotificationStore(state => state.markRead);
  const error = useNotificationStore(state => state.error);
  const mine = notifications.filter(item => String(item.memberId) === String(memberId));
  const unread = mine.filter(item => !item.read).length;

  async function refresh() {
    const [notifications, nextPreferences] = await Promise.all([getNotifications(), getNotificationPreferences()]);
    useNotificationStore.setState({ notifications, preferences: nextPreferences, error: '' });
  }
  return <>
    <button type="button" ref={triggerRef} className="notification-bell" aria-label={unread ? `알림, 읽지 않은 알림 ${unread}개` : '알림, 읽지 않은 알림 없음'} aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} popoverTarget={panelId}>
      <Bell size={theme.iconSize.md} aria-hidden="true" />
      {unread > 0 && <span className="notification-bell-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    <span className="notification-bell-status" role="status" aria-live="polite" aria-atomic="true">{unread > 0 ? `읽지 않은 알림 ${unread}개` : ''}</span>
    <div id={panelId} ref={panelRef} className="notification-panel" popover="auto" role="dialog" aria-label="알림센터" onToggle={event => setOpen(event.newState === 'open')}>
      <header className="notification-panel-heading"><div><h2>알림센터</h2><p>읽지 않은 알림 {unread}개</p></div><div className="notification-panel-actions"><button type="button" className="notification-panel-close" aria-label="알림 수신 설정" aria-pressed={settings} onClick={() => setSettings(value => !value)}><Settings size={theme.iconSize.md} aria-hidden /></button><button type="button" className="notification-panel-close" aria-label="알림센터 닫기" popoverTarget={panelId} popoverTargetAction="hide" autoFocus><X size={theme.iconSize.md} aria-hidden /></button></div></header>
      <div className="notification-panel-content">
      {error && <p role="status" className="notification-empty">{error}</p>}
      <div className={`notification-settings-collapse${settings ? ' is-expanded' : ''}`} aria-hidden={!settings} inert={!settings}><div className="notification-settings-inner"><div className="notification-preferences"><h3>알림 수신 설정</h3>{Object.entries(notificationTypeLabels).map(([type,label]) => <label key={type}><span>{label}</span><input type="checkbox" checked={preferences[type] !== false} disabled={savingPreference} onChange={async event => {
        const enabled = event.target.checked;
        setSavingPreference(true);
        try { await setNotificationPreference(type, enabled); await refresh(); }
        catch { useNotificationStore.setState({ error:'알림 설정을 저장하지 못했어요. 다시 시도해 주세요.' }); }
        finally { setSavingPreference(false); }
      }} /></label>)}<p>알림을 꺼도 저축 기록과 상담 답변은 계속 확인할 수 있어요.</p></div></div></div>
      {!settings && (mine.length ? <ul className="notification-list">{mine.map(item => <NotificationItem key={item.id} item={item} onRefresh={refresh} onError={error => useNotificationStore.setState({ error })} onRead={async () => {
        try {
          await readNotification(item.id); markRead(memberId,item.id);
          if (item.href?.startsWith('/') && !item.href.startsWith('//')) { panelRef.current?.hidePopover(); navigate(item.href); }
        } catch { useNotificationStore.setState({ error:'알림을 읽음 처리하지 못했어요. 다시 시도해 주세요.' }); }
      }} />)}</ul> : !error && <p className="notification-empty">아직 도착한 알림이 없어요.</p>)}

      </div>
    </div>
  </>;
}
