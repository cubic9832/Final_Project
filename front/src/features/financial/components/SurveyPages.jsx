import { Children, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SurveyPages({ children, size = 2, className = 'survey-review' }) {
  const items = Children.toArray(children);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 480px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 480px)');
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const pageSize = narrow ? 1 : size;
  const [page, setPage] = useState(0);
  const count = Math.ceil(items.length / pageSize);
  const current = Math.min(page, Math.max(0, count - 1));
  return <><ul className={className}>{items.slice(current * pageSize, (current + 1) * pageSize)}</ul>{count > 1 && <nav className="survey-page-controls" aria-label="목록 페이지"><button type="button" aria-label="이전 목록" disabled={!current} onClick={() => setPage(current - 1)}><ChevronLeft size={16} aria-hidden /></button><span aria-live="polite">{current + 1} / {count}</span><button type="button" aria-label="다음 목록" disabled={current === count - 1} onClick={() => setPage(current + 1)}><ChevronRight size={16} aria-hidden /></button></nav>}</>;
}
