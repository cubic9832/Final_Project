import { Fragment, useRef, useState } from 'react';
import { activateAdminChatbotPrompt, createAdminChatbotPrompt } from '../../features/chatbot/chatApi';

const emptyForm = { version: '', content: '', description: '' };
const errorMessage = error => error.response?.data?.detail || error.response?.data?.error?.message || '처리하지 못했습니다. 다시 시도해 주세요.';
const percent = (value, total) => total ? `${(value / total * 100).toFixed(1)}%` : '—';

export default function AdminChatPromptPanel({ state, onRefresh, onView }) {
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function openForm(prompt) {
    setForm(prompt ? { version: '', content: prompt.content, description: '' } : { ...emptyForm });
    setError(''); setNotice(''); setConfirm(null);
  }
  async function execute(action, success) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); onRefresh(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  function create(event) {
    event.preventDefault();
    if (!form.content.trim() || !form.description.trim()) { setError('답변 지침과 변경 설명을 입력해 주세요.'); return; }
    execute(async () => { await createAdminChatbotPrompt(form); setForm(null); }, '새 버전을 등록했습니다. 내용을 확인한 뒤 적용해 주세요.');
  }

  return <section className="admin-card compa-prompts">
    <div className="compa-admin-heading"><h3>프롬프트 버전</h3><button type="button" className="admin-primary-button" disabled={busy} onClick={() => openForm()}>새 버전 등록</button></div>
    <p className="compa-prompt-help">버전을 적용하면 이후 시작하는 AI 답변부터 사용합니다. 고정 답변은 집계에서 제외합니다.</p>
    {error && <p role="alert" className="compa-prompt-error">{error}</p>}
    {notice && <p role="status" className="compa-prompt-notice">{notice}</p>}
    {form && <form className="compa-prompt-form" onSubmit={create}>
      <h3>새 버전 등록</h3>
      <label>버전명<input required maxLength={40} pattern="[A-Za-z0-9._\-]+" title="영문, 숫자, 마침표, 밑줄, 하이픈으로 입력해 주세요." placeholder="예: v2" value={form.version} onChange={event => setForm({ ...form, version: event.target.value })} disabled={busy} /></label>
      <label>변경 설명<textarea required maxLength={500} rows={2} placeholder="이전 버전에서 바꾼 내용을 적어 주세요." value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} disabled={busy} /></label>
      <label>답변 지침<textarea required maxLength={16000} rows={12} placeholder="콤파의 답변 범위, 형식과 주의사항을 입력해 주세요." value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} disabled={busy} /></label>
      <p>등록한 본문은 수정하지 않습니다. 변경이 필요하면 기존 버전을 복사해 새 버전을 등록하세요.</p>
      <div className="compa-prompt-actions"><button type="button" className="admin-outline-button" disabled={busy} onClick={() => { setForm(null); setError(''); }}>취소</button><button type="submit" className="admin-primary-button" disabled={busy}>{busy ? '등록 중…' : '등록'}</button></div>
    </form>}
    {confirm && <section className="compa-prompt-confirm" aria-label="프롬프트 적용 확인">
      <h3>{confirm.version} 버전을 적용할까요?</h3><p>현재 버전을 전환합니다. 이미 처리 중인 답변과 기존 기록의 버전은 유지됩니다.</p>
      <div className="compa-prompt-actions"><button className="admin-outline-button" type="button" disabled={busy} onClick={() => setConfirm(null)}>취소</button><button className="admin-primary-button" type="button" disabled={busy} onClick={() => execute(async () => { await activateAdminChatbotPrompt(confirm.id); setConfirm(null); }, `${confirm.version} 버전을 적용했습니다.`)}>{busy ? '적용 중…' : '적용'}</button></div>
    </section>}
    {state.status === 'loading' && <p role="status" className="admin-empty">프롬프트를 불러오는 중…</p>}
    {state.status === 'error' && <p role="alert">{state.error} <button type="button" className="admin-text-button" onClick={onRefresh}>다시 시도</button></p>}
    {state.status === 'done' && <>
      <div className="compa-admin-table-wrap"><table className="compa-prompt-table"><caption className="sr-only">프롬프트 버전별 AI 답변과 사용자 평가</caption>
        <thead><tr>{['버전', '변경 설명', 'AI 답변', '좋아요', '싫어요', '평가 없음', '긍정 비율', '관리'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{state.data.length === 0 ? <tr><td colSpan={8}>등록된 버전이 없습니다.</td></tr> : state.data.map(({ prompt, answers, likes, dislikes, unrated }) => <Fragment key={prompt.id}>
          <tr><td><button className="admin-text-button" type="button" aria-expanded={expanded === prompt.id} onClick={() => setExpanded(expanded === prompt.id ? null : prompt.id)}>{prompt.version}</button>{prompt.active && <span className="admin-status is-ok">적용 중</span>}</td>
            <td>{prompt.description}<small>{prompt.createdAt?.slice(0, 10)}</small></td><td>{answers.toLocaleString()}</td><td>{likes.toLocaleString()}</td><td>{dislikes.toLocaleString()}</td><td>{unrated.toLocaleString()}</td><td>{percent(likes, likes + dislikes)}<small>평가 참여 {percent(likes + dislikes, answers)}</small></td>
            <td><div className="compa-prompt-row-actions"><button className="admin-text-button" type="button" onClick={() => onView(prompt.version)}>평가 보기</button><button className="admin-text-button" type="button" disabled={busy} onClick={() => openForm(prompt)}>복사</button>{!prompt.active && <button className="admin-text-button" type="button" disabled={busy} onClick={() => { setConfirm(prompt); setError(''); setNotice(''); }}>적용</button>}</div></td></tr>
          {expanded === prompt.id && <tr><td colSpan={8} className="compa-prompt-content"><h3>{prompt.version} 답변 지침</h3><p>{prompt.content}</p>{prompt.activatedAt && <small>최근 적용 {prompt.activatedAt.replace('T', ' ').slice(0, 19)}</small>}</td></tr>}
        </Fragment>)}</tbody>
      </table></div>
      <p className="compa-prompt-help">긍정 비율은 평가받은 답변 중 좋아요의 비율입니다. 비교할 때 사용 모델·질문·참고 자료의 차이도 확인하세요.</p>
    </>}
  </section>;
}
