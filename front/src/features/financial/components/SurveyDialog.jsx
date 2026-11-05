import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function SurveyDialog({ title, children, onClose, onSave, dirty = false }) {
  const dialog = useRef(null);
  const continueButton = useRef(null);
  const lastField = useRef(null);
  const titleId = useId();
  const [confirmSave, setConfirmSave] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    if (confirmSave) continueButton.current?.focus();
    else if (lastField.current?.isConnected) lastField.current.focus();
  }, [confirmSave]);
  function requestClose() {
    if (confirmSave) { onClose(); return; }
    if (dirty) {
      lastField.current = document.activeElement;
      setConfirmSave(true);
    } else onClose();
  }
  function isBackdrop(event) {
    if (event.target !== event.currentTarget) return false;
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  return createPortal(<dialog ref={dialog} className="survey-dialog" closedby="none" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); }}
    onClose={event => {
      // A browser-originated close must not leave an invisible, mounted editor behind.
      const element = event.currentTarget;
      if (!element.isConnected || element.open) return;
      if (dirty) { element.showModal(); setConfirmSave(true); }
      else onClose();
    }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
    }}
    onPointerDown={event => {
      event.stopPropagation();
      if (isBackdrop(event)) event.preventDefault();
    }}
    onClick={event => event.stopPropagation()}>
    <header><h2 id={titleId}>{title}</h2><button type="button" aria-label="닫기" onClick={requestClose}><X size={20} aria-hidden /></button></header>
    <div className="survey-dialog-content" hidden={!confirmSave}>
      <p>저장하지 않은 변경 내용이 있습니다.<br />저장하시겠습니까?</p>
      <div className="survey-dialog-actions"><button ref={continueButton} type="button" className="survey-previous" onClick={() => setConfirmSave(false)}>계속 입력</button><button type="button" className="survey-next" onClick={() => { setConfirmSave(false); if (onSave) onSave(); else onClose(); }}>저장하기</button></div>
    </div>
    <form hidden={confirmSave} onSubmit={event => { event.preventDefault(); event.stopPropagation(); if (confirmSave) return; if (onSave) onSave(); else onClose(); }}><div className="survey-dialog-content">{children}</div><footer><button type="submit" className="survey-next">{onSave ? '저장' : '확인'}</button></footer></form>
  </dialog>, document.body);
}
