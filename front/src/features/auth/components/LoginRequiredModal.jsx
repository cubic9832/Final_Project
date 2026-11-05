import Modal from '../../../shared/ui/Modal.jsx';

export default function LoginRequiredModal({ onClose, onLogin }) {
  return <Modal title="로그인이 필요한 기능입니다" subtitle="로그인하고 추가 추천 차량을 확인해 보세요." onClose={onClose} size="sm">
    <div className="auth-modal-actions">
      <button type="button" className="auth-modal-button" onClick={onClose}>취소</button>
      <button type="button" className="auth-modal-button auth-modal-button-primary" onClick={onLogin} data-autofocus>로그인하기</button>
    </div>
  </Modal>;
}
