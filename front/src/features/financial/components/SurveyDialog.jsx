import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function SurveyDialog({ title, children, onClose, onSave, dirty = false }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, []);
  const close = () => dirty ? setConfirmDiscard(true) : onClose();
  return createPortal(<dialog ref={dialog} className="survey-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" aria-label="닫기" onClick={close}><X size={20} aria-hidden /></button></header>
    {confirmDiscard ? <div className="survey-dialog-content"><p>저장하지 않은 변경을 버릴까요?</p><div className="survey-dialog-actions"><button type="button" className="survey-previous" onClick={() => setConfirmDiscard(false)}>계속 입력</button><button type="button" className="survey-next" onClick={onClose}>변경 버리기</button></div></div> : <form onSubmit={event => { event.preventDefault(); event.stopPropagation(); if (onSave) onSave(); else onClose(); }}><div className="survey-dialog-content">{children}</div><footer><button type="submit" className="survey-next">{onSave ? '저장' : '확인'}</button></footer></form>}
  </dialog>, document.body);
}
