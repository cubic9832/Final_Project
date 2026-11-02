import { useState } from 'react';
import ConsultationSuggest from './ConsultationSuggest';
import './ConsultationLink.css';

// 보완 14: 콤파 답 아래 "도움이 됐나요? [네] [아니요]"
//   [아니요] → 상담원 연결 안내 (D) / [네] → 고마움 인사만
//   remind: 이 답이 한 대화에서 3번째 이상 질문의 마지막 답이면 누르지 않아도 상담원 안내 (E) — [네] 를 누르면 숨긴다
// 고른 값은 이 화면에서만 기억한다 (저장 · 통계는 하지 않음 — 회의 안건 ⑤ 에서 정하면 여기서 서버로 보내면 된다)
export default function AnswerFeedback({ remind, onNavigate }) {
  const [answer, setAnswer] = useState(null); // null · 'yes' · 'no'

  return (
    <div className="answer-feedback">
      {answer === null && (
        <div className="answer-feedback-ask" role="group" aria-label="이 답이 도움이 됐나요?">
          <span>도움이 됐나요?</span>
          <button type="button" onClick={() => setAnswer('yes')}>네</button>
          <button type="button" onClick={() => setAnswer('no')}>아니요</button>
        </div>
      )}
      {answer === 'yes' && <p className="answer-feedback-thanks">알려 주셔서 고마워요.</p>}
      {answer === 'no' && <ConsultationSuggest reason="no" onNavigate={onNavigate} />}
      {answer === null && remind && <ConsultationSuggest reason="many" onNavigate={onNavigate} />}
    </div>
  );
}
