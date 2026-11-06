import { notificationTypeLabels } from '../notificationTypeLabels.js';
import { useEffect, useRef, useState } from 'react';
import { BellOff, EllipsisVertical, Trash2 } from 'lucide-react';
import theme from '../../../styles/theme';
import { deleteNotification, setNotificationPreference } from '../notificationApi';

// 11-05: 상담 알림(CHAT_*) 이름 추가

export default function NotificationItem({ item, onRead, onRefresh, onError }) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const firstAction = useRef(null);
  function close() { setMenu(false); trigger.current?.focus(); }
  useEffect(() => {
    if (!menu) return;
    firstAction.current?.focus({ preventScroll: true });
    const outside = event => { if (!root.current?.contains(event.target)) setMenu(false); };
    const escape = event => { if (event.key === 'Escape') { event.stopPropagation(); setMenu(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    const element = root.current;
    element.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); element.removeEventListener('keydown', escape); };
  }, [menu]);
  async function act(action) {
    if (busy) return;
    setBusy(true);
    try { await action(); close(); await onRefresh(); }
    catch { onError('알림 설정을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  return <li className="notification-item" ref={root}>
    <button type="button" className={`notification-item-body${item.read ? ' is-read' : ''}`} onClick={onRead}>
      <strong>{item.title}</strong>{item.message && <span>{item.message}</span>}<small>{item.read ? '읽음' : '새 알림'}</small>
    </button>
    <button type="button" ref={trigger} className="notification-more" aria-label={`${item.title} 더 보기`} aria-expanded={menu} onClick={() => setMenu(value => !value)}><EllipsisVertical size={theme.iconSize.sm} aria-hidden /></button>
    <div className={`notification-menu-collapse${menu ? ' is-expanded' : ''}`} aria-hidden={!menu} inert={!menu}><div className="notification-menu-inner"><div className="notification-item-menu" aria-label="알림 관리">
      <button type="button" ref={firstAction} className="notification-delete" disabled={busy} onClick={() => act(() => deleteNotification(item.id))}><Trash2 size={theme.iconSize.sm} aria-hidden />삭제하기</button>
      {notificationTypeLabels[item.type] && <button type="button" disabled={busy} onClick={() => act(() => setNotificationPreference(item.type, false))}><BellOff size={theme.iconSize.sm} aria-hidden /><span>이 유형 알림 끄기<small>{notificationTypeLabels[item.type]} 알림을 끕니다.</small></span></button>}
      <button type="button" onClick={close}>취소</button>
    </div></div></div>
  </li>;
}
