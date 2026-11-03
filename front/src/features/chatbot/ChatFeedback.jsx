import { useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import theme from '../../styles/theme';
import { rateChatAnswer } from './chatApi';

export default function ChatFeedback({ message, onRated }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);

  async function choose(value) {
    if (inFlight.current) return;
    const rating = message.rating === value ? null : value;
    inFlight.current = true;
    setPending(true); setError('');
    try {
      await rateChatAnswer(message.id, rating);
      onRated(message.id, rating);
    } catch (failure) {
      setError(failure.response?.data?.detail || failure.response?.data?.error?.message || '평가를 저장하지 못했어요. 다시 선택해 주세요.');
    } finally { inFlight.current = false; setPending(false); }
  }

  return <div className="compa-feedback" aria-label="이 답변 평가" aria-busy={pending}>
    <div className="compa-feedback-actions" role="group" aria-label="좋아요 또는 싫어요 선택">
      <button type="button" disabled={pending} aria-pressed={message.rating === 'LIKE'} onClick={() => choose('LIKE')} title="다시 누르면 평가 취소">
        <ThumbsUp size={theme.iconSize.sm} aria-hidden="true" />좋아요
      </button>
      <button type="button" disabled={pending} aria-pressed={message.rating === 'DISLIKE'} onClick={() => choose('DISLIKE')} title="다시 누르면 평가 취소">
        <ThumbsDown size={theme.iconSize.sm} aria-hidden="true" />싫어요
      </button>
    </div>
    {error && <p className="compa-feedback-error" role="alert">{error}</p>}
  </div>;
}
