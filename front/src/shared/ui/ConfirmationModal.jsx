import Modal from './Modal.jsx';
import './ConfirmationModal.css';

// 공통 모달의 접근성·포커스 동작을 유지하면서 안내와 확인에 일관된 표현을 제공한다.
export default function ConfirmationModal({ title, message, guidance, guidanceLabel = '확인 사항', onClose,
  onConfirm, confirmLabel = '확인', cancelLabel = '취소', busy = false, error }) {
  return <Modal title={title} className="notice-modal" size="md"
    onClose={onClose} busy={busy} dismissible={!onConfirm}>
    <div className="notice-modal-content">
      <p className="notice-modal-message">{message}</p>
      {guidance && <div className="notice-modal-guidance"><strong>{guidanceLabel}</strong><p>{guidance}</p></div>}
      {error && <p className="notice-modal-error" role="alert">{error}</p>}
    </div>
    <div className="notice-modal-footer">
      {onConfirm && <button type="button" className="auth-modal-button" data-autofocus disabled={busy} onClick={onClose}>{cancelLabel}</button>}
      <button type="button" className="auth-modal-button auth-modal-button-primary" data-autofocus={!onConfirm || undefined}
        disabled={busy} onClick={onConfirm || onClose}>{busy ? '처리 중…' : confirmLabel}</button>
    </div>
  </Modal>;
}
