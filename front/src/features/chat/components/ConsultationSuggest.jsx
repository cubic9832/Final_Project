import ConsultationLink from './ConsultationLink';
import './ConsultationLink.css';

// 보완 14: 콤파가 원하는 답을 못 줬을 때 띄우는 상담원 연결 안내 (콤파 맨 위의 작은 버튼과 따로)
// reason: 'no' = [아니요] 를 누름 / 'many' = 한 대화에서 여러 번 물어봄 / 'error' = 답을 못 받음 · 오늘 AI 질문을 다 씀
const MESSAGES = {
  no: '원하는 답을 드리지 못했어요. 상담원에게 직접 물어볼 수 있어요.',
  many: '여러 번 물어보셨네요. 상담원과 바로 이야기해 볼까요?',
  error: '콤파가 지금 답하기 어려워요. 상담원에게 물어보세요.',
};

export default function ConsultationSuggest({ reason, onNavigate }) {
  return (
    <div className="consultation-suggest" role="note">
      <p>{MESSAGES[reason]}</p>
      <ConsultationLink onNavigate={onNavigate} />
    </div>
  );
}
