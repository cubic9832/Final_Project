import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import theme from '../../../styles/theme.js';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal.jsx';
import './AdminEditorFrame.css';
import useUnsavedChanges from '../../../shared/navigation/useUnsavedChanges.js';

// 등록·수정 화면의 복귀, 변경 폐기, 삭제 확인, 하단 작업 위치를 함께 관리한다.
export default function AdminEditorFrame({ title, children, onCancel, isDirty = false, busy = false,
  formId, canSave = true, saveDisabled = false, saveLabel = '저장', onDelete, checkDelete,
  deleteError, deleteMessage = '이 항목을 삭제할까요?', secondaryActions }) {
  const [confirmation, setConfirmation] = useState('');
  const [checkingDelete, setCheckingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState(null);
  const checking = useRef(false);
  const heading = useRef(null);
  const { requestLeave } = useUnsavedChanges(isDirty, { busy: busy || checkingDelete });
  useEffect(() => { heading.current?.focus(); }, []);
  function close() { if (!busy && !checking.current) requestLeave(onCancel); }
  async function requestDelete() {
    if (busy || checking.current) return;
    checking.current = true; setCheckingDelete(true); setDeleteReason(null);
    try {
      const reason = await checkDelete?.();
      setDeleteReason(typeof reason === 'string' ? { message: reason } : reason || null); setConfirmation(reason ? 'delete-blocked' : 'delete');
    } catch {
      setDeleteReason({ message: '삭제 가능 여부를 확인하지 못했습니다.', guidance: '잠시 후 삭제 버튼을 다시 눌러 확인해 주세요.' });
      setConfirmation('delete-blocked');
    } finally { checking.current = false; setCheckingDelete(false); }
  }
  return <section className="admin-editor-frame">
    <header className="admin-editor-frame-heading"><button type="button" className="admin-text-button" disabled={busy || checkingDelete} onClick={close}><ArrowLeft size={theme.iconSize.sm} aria-hidden="true" />목록으로</button><h3 ref={heading} tabIndex={-1}>{title}</h3></header>
    <div className="admin-editor-frame-body">{children}</div>
    <footer className="admin-editor-frame-footer">
      <div className="admin-editor-frame-secondary">{onDelete && <button type="button" className="admin-outline-button" disabled={busy || checkingDelete} onClick={requestDelete}>{checkingDelete ? '확인 중…' : '삭제'}</button>}{secondaryActions}</div><div className="admin-editor-frame-primary"><button type="button" className="admin-outline-button" disabled={busy || checkingDelete} onClick={close}>취소</button>{canSave && <button type="submit" form={formId} className="admin-primary-button" disabled={busy || checkingDelete || saveDisabled} aria-busy={busy}>{busy ? '저장 중…' : saveLabel}</button>}</div>
    </footer>
    {confirmation === 'delete-blocked' && <ConfirmationModal title="삭제할 수 없습니다" message={deleteReason?.message} guidance={deleteReason?.guidance} guidanceLabel="삭제 전 필요한 조치" onClose={() => setConfirmation('')} />}
    {confirmation === 'delete' && <ConfirmationModal title="삭제하시겠습니까?" message={deleteMessage} busy={busy} error={deleteError} onClose={() => setConfirmation('')} onConfirm={onDelete} confirmLabel="삭제" />}

  </section>;
}
