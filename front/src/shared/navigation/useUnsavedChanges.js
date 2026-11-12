import { useCallback, useContext, useId, useLayoutEffect } from 'react';
import { UnsavedChangesContext } from './UnsavedChangesContext.js';

// 화면은 변경 여부만 전달하고, 이동·폐기 확인은 공통 Provider가 처리한다.
export default function useUnsavedChanges(isDirty, { busy = false, inline = false } = {}) {
  const id = useId();
  const context = useContext(UnsavedChangesContext);
  if (!context) throw new Error('UnsavedChangesProvider가 필요합니다.');
  const { register, requestLeave, requestNavigation, allowLeave, ownerId, confirmLeave, cancelLeave } = context;
  useLayoutEffect(() => {
    if (!isDirty && !busy) return;
    return register(id, { dirty: Boolean(isDirty), busy, inline });
  }, [register, id, isDirty, busy, inline]);
  const request = useCallback(action => requestLeave(id, action), [requestLeave, id]);
  return { requestLeave: request, requestNavigation, allowLeave, confirming: ownerId === id, confirmLeave, cancelLeave };
}
