import { Headset } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import theme from '../../../styles/theme';
import './ConsultationLink.css';

// 8단계: 콤파(AI 챗봇) 안의 [상담원과 1:1 상담] 버튼 — 누르면 콤파를 닫고 상담 화면으로 이동만 한다
// 11-05 (조장 확인): 콤파가 원하는 답을 주지 못한 답 아래에만 나온다 — 서버 판단(consultSuggested) 또는 회원의 [싫어요]
// 로그인 전이면 /mypage/consultation 의 RequireAuth 가 로그인 화면으로 보낸다
export default function ConsultationLink({ onNavigate }) {
  const navigate = useNavigate();

  function handleClick() {
    onNavigate?.();
    navigate('/mypage/consultation');
  }

  return (
    <button type="button" className="consultation-link" onClick={handleClick}>
      <Headset size={theme.iconSize.sm} aria-hidden="true" />
      상담원과 1:1 상담하기
    </button>
  );
}
