import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import ConfirmationModal from '../ui/ConfirmationModal.jsx';
import { UnsavedChangesContext } from './UnsavedChangesContext.js';

export default function UnsavedChangesProvider({ children }) {
  const [guards, setGuards] = useState(() => new Map());
  const bypass = useRef(false);
  const [pending, setPending] = useState(null);
  const register = useCallback((id, guard) => {
    setGuards(current => new Map(current).set(id, guard));
    return () => {
      setGuards(current => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
      setPending(current => current?.ownerId === id ? null : current);
    };
  }, []);
  const shouldBlock = useCallback(() => !bypass.current && [...guards.values()].some(guard => guard.dirty || guard.busy), [guards]);
  const blocker = useBlocker(shouldBlock);
  const latestGuard = useCallback(() => {
    const active = [...guards.entries()].reverse().filter(([, guard]) => guard.dirty || guard.busy);
    return active.find(([, guard]) => guard.inline) || active[0];
  }, [guards]);
  const allowLeave = useCallback(action => {
    // 저장 성공 직후에는 다시 그려질 때까지 기다리지 않고 해당 동작만 허용한다.
    bypass.current = true;
    try { action(); } finally { bypass.current = false; }
  }, []);
  const requestLeave = useCallback((id, action) => {
    const guard = guards.get(id);
    if (guard?.busy) return;
    if (guard?.dirty) setPending({ ownerId: id, action });
    else action();
  }, [guards]);
  const requestNavigation = useCallback(action => {
    if ([...guards.values()].some(guard => guard.busy)) return;
    const owner = latestGuard();
    if (owner) setPending({ ownerId: owner[0], action });
    else action();
  }, [guards, latestGuard]);
  const ownerId = blocker.state === 'blocked' ? latestGuard()?.[0] : pending?.ownerId;
  const owner = guards.get(ownerId);
  const busy = [...guards.values()].some(guard => guard.busy);
  function cancelLeave() {
    setPending(null);
    if (blocker.state === 'blocked') blocker.reset();
  }
  function confirmLeave() {
    if (busy) return;
    if (blocker.state === 'blocked') {
      setPending(null);
      blocker.proceed();
    } else if (pending) {
      const action = pending.action;
      setPending(null);
      allowLeave(action);
    }
  }
  useEffect(() => {
    if (blocker.state === 'blocked' && !latestGuard()) blocker.proceed();
  }, [blocker, latestGuard]);
  useEffect(() => {
    function beforeUnload(event) {
      if (shouldBlock()) { event.preventDefault(); event.returnValue = ''; }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [shouldBlock]);
  const context = { register, requestLeave, requestNavigation, allowLeave, ownerId, confirmLeave, cancelLeave };
  return <UnsavedChangesContext.Provider value={context}>
    {children}
    {ownerId && !owner?.inline && <ConfirmationModal title="변경사항을 저장하지 않고 나갈까요?"
      message="저장하지 않은 내용은 사라집니다." onClose={cancelLeave} onConfirm={confirmLeave}
      cancelLabel="계속 작성" confirmLabel="저장하지 않고 나가기" busy={busy} />}
  </UnsavedChangesContext.Provider>;
}
