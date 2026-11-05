import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import theme from '../../../styles/theme.js';
import SurveySummary from './SurveySummary.jsx';
import './RecommendationSurvey.css';

export default function RecommendationSurvey({ phase, index, total, question, value, onChange, onBack, onNext, nextLabel = '다음', busy = false, disabled = false, error, loading, diagnosis, children, formRef, canGoBack = true, summaryItems = [], summaryMode = 'budget', onEditSummary, onBudgetChange }) {
  const heading = useRef(null);
  const [optionPagination, setOptionPagination] = useState({ questionId: question.id, page: 0 });
  const optionPage = optionPagination.questionId === question.id ? optionPagination.page : 0;
  const setOptionPage = page => setOptionPagination({ questionId: question.id, page });
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index, question.id]);
  const defaultOptionPageSize = question.compact ? 9 : 4;
  const optionPageSize = question.showAllOptions ? Math.max(1, question.options?.length ?? 0) : defaultOptionPageSize;
  const optionPageCount = Math.ceil((question.options?.length ?? 0) / optionPageSize);
  const currentOptionPage = Math.min(optionPage, Math.max(0, optionPageCount - 1));
  return <div className="recommendation-survey">
    <div className="survey-navigation">
      <h1>차량 맞춤 추천</h1><span className="survey-phase">{phase}</span>
    </div>
    <p className="survey-introduction">재무 상태와 차량 취향에 맞는 나만의 차량을 찾아보세요.</p>
    <div className="survey-progress-label"><span>{phase}</span><span>{index + 1} / {total}</span></div>
    <progress className="survey-progress" value={index + 1} max={total} aria-label={`${phase} 진행 상황`} />
    <form ref={formRef} onSubmit={event => { event.preventDefault(); if (!disabled && !busy) onNext(); }}>
      <section className="survey-question" aria-labelledby="survey-title">
        <div className="survey-body"><div className="survey-answer" key={question.id}>
        <p className="survey-eyebrow">{question.category}</p>
        <h2 id="survey-title" ref={heading} tabIndex={-1}>{question.title}</h2>
        <p id="survey-description" className="survey-description">{question.description}</p>
        <div className={`survey-answer-content${question.showAllOptions ? ' survey-answer-content-wide' : ''}`}>
        {question.options && <fieldset className={`survey-options${question.compact ? ' survey-options-grid' : ''}`} disabled={busy} aria-describedby="survey-description">
          <legend className="survey-sr-only">{question.title}</legend>
          {question.options.slice(currentOptionPage * optionPageSize, (currentOptionPage + 1) * optionPageSize).map(option => <label key={String(option.value)} className={`survey-option${String(value) === String(option.value) ? ' is-selected' : ''}`}>
            <input type="radio" name={question.id} value={String(option.value)} checked={String(value) === String(option.value)} onClick={() => { if (String(value) === String(option.value)) onChange(null); }} onChange={() => onChange(option.value)} />
            <span className="survey-option-copy"><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
            <span className="survey-check" aria-hidden>{String(value) === String(option.value) && <Check size={theme.iconSize.sm} />}</span>
          </label>)}
        </fieldset>}
        {optionPageCount > 1 && <nav className="survey-page-controls" aria-label="선택지 페이지"><button type="button" aria-label="이전 선택지" disabled={busy || !currentOptionPage} onClick={() => setOptionPage(currentOptionPage - 1)}><ChevronLeft size={16} aria-hidden /></button><span aria-live="polite">{currentOptionPage + 1} / {optionPageCount}</span><button type="button" aria-label="다음 선택지" disabled={busy || currentOptionPage === optionPageCount - 1} onClick={() => setOptionPage(currentOptionPage + 1)}><ChevronRight size={16} aria-hidden /></button></nav>}
        {children}
        </div>
        </div><SurveySummary diagnosis={diagnosis} items={summaryItems} mode={summaryMode} onEdit={onEditSummary} editingDisabled={busy} onBudgetChange={onBudgetChange} /></div>
      </section>

      <div className="survey-footer">
        {loading && <p role="status" className="survey-sr-only">추천 정보를 불러오고 있어요…</p>}
        {error && <p role={busy ? 'status' : 'alert'} className="survey-status">{error}</p>}
        <div className="survey-actions">
          {canGoBack && <button type="button" className="survey-previous" onClick={onBack} disabled={busy}>이전</button>}
          <button type="submit" className={`survey-next${question.id === 'review' ? ' survey-submit' : ''}`} disabled={disabled || busy} aria-busy={busy}>{busy && <LoaderCircle className="survey-spinner" size={theme.iconSize.md} aria-hidden />}{busy ? '내 차를 찾고 있어요…' : nextLabel}</button>
        </div>
      </div>
    </form>
  </div>;
}
