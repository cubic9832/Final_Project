import AdminListHeader from './components/AdminListHeader.jsx';
import AdminDataTable from './components/AdminDataTable.jsx';
import AdminDetailRow from './components/AdminDetailRow.jsx';
import { Fragment, useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Search } from 'lucide-react';
import theme from '../../styles/theme';
import Pagination from '../../components/Pagination';
import { getAdminChatbotExchanges, getAdminChatbotMessages, getAdminChatbotPrompts } from '../../features/chatbot/chatApi';
import AdminChatPromptPanel from './AdminChatPromptPanel';
import { nextTableSort } from './adminTableData.js';
import { formatAdminDate } from './adminDateFormat.js';
import './AdminChatbotPanel.css';
import './components/AdminListSummary.css';
import useUnsavedChanges from '../../shared/navigation/useUnsavedChanges.js';

const tableColumns = [
  { key: 'number', label: '번호', width: 8 },
  { key: 'question', label: '질문', width: 30, align: 'left' },
  { key: 'member', label: '회원', width: 10 },
  { key: 'source', label: '질문 방식', width: 12 },
  { key: 'answer', label: '답변', width: 8 },
  { key: 'rating', label: '평가', width: 11 },
  { key: 'createdAt', label: '등록일', width: 14 },
  { key: 'detail', label: '상세', width: 7, sortable: false },
];

const sourceLabels = { DIRECT_INPUT: '직접 입력', QUICK_QUESTION: '추천 질문', TERM_CLICK: '용어 클릭' };
const ratingLabels = { LIKE: '좋아요', DISLIKE: '싫어요' };
const failureMessage = (failure) => failure.response?.data?.detail || failure.response?.data?.error?.message || '조회하지 못했습니다. 다시 시도해 주세요.';

export default function AdminChatbotPanel() {
  const { requestNavigation } = useUnsavedChanges(false);
  const [tab, setTab] = useState('history');
  const [historySearch, setHistorySearch] = useState('');
  const [reload, setReload] = useState(0);
  const [prompts, setPrompts] = useState({ status: 'loading', data: [], error: '' });
  useEffect(() => {
    const controller = new AbortController();
    getAdminChatbotPrompts(controller.signal).then(data => {
      if (!controller.signal.aborted) setPrompts({ status: 'done', data, error: '' });
    }).catch(failure => {
      if (!controller.signal.aborted) setPrompts({ status: 'error', data: [], error: failureMessage(failure) });
    });
    return () => controller.abort();
  }, [reload]);
  function refresh() { setPrompts(current => ({ ...current, status: 'loading', error: '' })); setReload(value => value + 1); }
  return <div className="admin-panel-stack compa-admin">
    <div className="compa-admin-tabs" role="tablist" aria-label="콤파 관리">
      <button id="compa-history-tab" role="tab" aria-selected={tab === 'history'} aria-controls="compa-history-panel" type="button" onClick={() => { if (tab !== 'history') requestNavigation(() => setTab('history')); }}>대화·평가 기록</button>
      <button id="compa-prompts-tab" role="tab" aria-selected={tab === 'prompts'} aria-controls="compa-prompts-panel" type="button" onClick={() => { if (tab !== 'prompts') requestNavigation(() => { setTab('prompts'); refresh(); }); }}>프롬프트 관리</button>
    </div>
    <section id={tab === 'history' ? 'compa-history-panel' : 'compa-prompts-panel'} role="tabpanel" aria-labelledby={tab === 'history' ? 'compa-history-tab' : 'compa-prompts-tab'}>
      {tab === 'prompts' ? <AdminChatPromptPanel state={prompts} onRefresh={refresh} onView={version => requestNavigation(() => { setHistorySearch(version); setTab('history'); })} /> :
        <ChatbotHistory key={historySearch} initialKeyword={historySearch} />}
    </section>
  </div>;
}

function ChatbotHistory({ initialKeyword }) {
  const [query, setQuery] = useState({ rating: 'ALL', page: 0, keyword: initialKeyword, sort: '', direction: 'ASC' });
  const [keyword, setKeyword] = useState(initialKeyword);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [selected, setSelected] = useState(null);
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getAdminChatbotExchanges(query.rating, query.page, controller.signal, query.keyword, query.sort, query.direction).then((data) => {
      if (!controller.signal.aborted) setState({ status: 'done', data, error: '' });
    }).catch((failure) => {
      if (!controller.signal.aborted) setState({ status: 'error', data: null, error: failureMessage(failure) });
    });
    return () => controller.abort();
  }, [query, reload]);

  function changeQuery(next) {
    setState({ status: 'loading', data: null, error: '' }); setSelected(null); setContextOpen(false); setQuery(next);
  }

  function sortBy(column) {
    const next = nextTableSort({ column: query.sort, direction: query.direction }, column);
    changeQuery({ ...query, page: 0, sort: next.column, direction: next.direction });
  }

  function select(item) {
    setSelected(selected?.answerId === item.answerId ? null : item);
    setContextOpen(false);
  }

  return <div className="admin-panel-stack compa-admin">
    <section className="admin-card">
      <AdminListHeader className="compa-admin-heading" title="콤파 대화 기록">
      <form className="compa-admin-toolbar" onSubmit={(event) => { event.preventDefault(); changeQuery({ ...query, keyword: keyword.trim(), page: 0 }); }}>
        <div className="compa-admin-search form-focus-group">
          <input type="search" aria-label="질문, 회원 닉네임 또는 프롬프트 버전 검색" placeholder="질문·회원 닉네임·버전 검색" value={keyword} maxLength={50} onChange={(event) => setKeyword(event.target.value)} />
          <button type="submit" className="compa-admin-search-submit" aria-label="질문, 회원 닉네임 또는 버전 검색"><Search size={theme.iconSize.md} aria-hidden="true" /></button>
        </div>
      </form>
      </AdminListHeader>
      {state.status === 'loading' && <p className="admin-empty" role="status">대화 기록을 불러오는 중…</p>}
      {state.status === 'error' && <p className="admin-empty" role="alert">{state.error} <button type="button" className="admin-text-button" onClick={() => { setState({ status: 'loading', data: null, error: '' }); setReload((value) => value + 1); }}>다시 시도</button></p>}
      {state.status === 'done' && <>
        {state.data.ratingCounts && <p className="compa-admin-rating-counts" role="status"><span className="compa-admin-version-summary">{state.data.promptVersion ? `프롬프트 ${state.data.promptVersion}` : '전체 버전·고정 답변 포함'}</span><span>좋아요 {state.data.ratingCounts.likes.toLocaleString()}건</span><span>싫어요 {state.data.ratingCounts.dislikes.toLocaleString()}건</span><span>평가 없음 {state.data.ratingCounts.unrated.toLocaleString()}건</span></p>}
        <AdminDataTable className="compa-admin-table" caption="콤파 질문·답변 및 평가 목록" columns={tableColumns} minWidth="860px" sort={{ column: query.sort, direction: query.direction }} onSort={sortBy}>
          {state.data.items.length === 0 ? <tr><td colSpan={8} className="compa-admin-empty">조건에 맞는 대화가 없습니다.</td></tr> : state.data.items.map((item) => <Fragment key={item.answerId}>
            <tr className={selected?.answerId === item.answerId ? 'compa-admin-selected' : ''}>
              <td>{item.number}</td>
              <td className="compa-admin-question admin-table-text"><button type="button" className="compa-admin-subject" aria-expanded={selected?.answerId === item.answerId} aria-controls={`compa-admin-detail-${item.answerId}`} onClick={() => select(item)}><span className="admin-list-summary">{item.question}</span></button></td>
              <td>{item.userName || '닉네임 없음'}</td>
              <td>{sourceLabels[item.questionSource] || item.questionSource}</td><td>{item.answerType === 'FIXED' ? '고정' : 'AI'}</td>
              <td><span className="compa-admin-rating">{item.rating === 'LIKE' ? <ThumbsUp size={theme.iconSize.sm} aria-hidden="true" /> : item.rating === 'DISLIKE' ? <ThumbsDown size={theme.iconSize.sm} aria-hidden="true" /> : null}{ratingLabels[item.rating] || '평가 없음'}</span></td>
              <td><time dateTime={item.createdAt}>{formatAdminDate(item.createdAt)}</time></td>
              <td><button className="admin-text-button" type="button" aria-expanded={selected?.answerId === item.answerId} aria-controls={`compa-admin-detail-${item.answerId}`} aria-label={`${item.question} 상세 ${selected?.answerId === item.answerId ? '접기' : '보기'}`} onClick={() => select(item)}>{selected?.answerId === item.answerId ? '접기' : '보기'}</button></td>
            </tr>
            <AdminDetailRow open={selected?.answerId === item.answerId} colSpan={tableColumns.length} className="compa-admin-detail-cell"><section className="compa-admin-detail" id={`compa-admin-detail-${item.answerId}`} aria-label="질문과 답변 상세">
              <p className="compa-prompt-answer-meta">{item.answerType === 'FIXED' ? '고정 답변 · 프롬프트 미사용' : `프롬프트 ${item.promptVersion || '—'} · ${item.provider || '제공사 기록 없음'} · ${item.model || '모델 기록 없음'}`}</p>
              <h3>질문</h3><p>{item.question}</p><h3>콤파 답변</h3><p>{item.answer}</p>
              <button type="button" className="admin-outline-button" aria-expanded={contextOpen} onClick={() => setContextOpen(!contextOpen)}><MessageSquare size={theme.iconSize.sm} aria-hidden="true" />{contextOpen ? '대화 맥락 접기' : '대화 맥락 보기'}</button>
              {contextOpen && <Conversation key={item.conversationId} exchange={item} />}
            </section></AdminDetailRow>
          </Fragment>)}
        </AdminDataTable>
        <Pagination ariaLabel="콤파 대화 목록 페이지" page={query.page} totalPages={state.data.totalPages} onChange={(page) => changeQuery({ ...query, page })} />
      </>}
    </section>
  </div>;
}

function Conversation({ exchange }) {
  const [beforeId, setBeforeId] = useState(exchange.answerId + 1);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    getAdminChatbotMessages(exchange.conversationId, beforeId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ status: 'done', data, error: '' });
    }).catch((failure) => {
      if (!controller.signal.aborted) setState({ status: 'error', data: null, error: failureMessage(failure) });
    });
    return () => controller.abort();
  }, [exchange.conversationId, beforeId, reload]);
  return <section className="compa-admin-context" aria-label="선택한 답변의 대화 맥락">
    <h3>대화 내용</h3>
    {state.status === 'loading' && <p role="status">대화를 불러오는 중…</p>}
    {state.status === 'error' && <p role="alert">{state.error} <button type="button" className="admin-text-button" onClick={() => { setState({ status: 'loading', data: null, error: '' }); setReload((value) => value + 1); }}>다시 시도</button></p>}
    {state.status === 'done' && <>
      {state.data.messages.map((message) => <div className="compa-admin-context-message" data-selected={message.id === exchange.answerId} key={message.id}>
        <strong>{message.role === 'user' ? '사용자' : '콤파'}{message.rating ? ` · ${ratingLabels[message.rating]}` : ''}</strong><p>{message.text}</p>
      </div>)}
      {(state.data.hasMore || state.data.hasNewer) && <div className="compa-admin-pagination">
        {state.data.hasMore && <button type="button" className="admin-outline-button" onClick={() => { setBeforeId(state.data.messages[0].id); setState({ status: 'loading', data: null, error: '' }); }}>이전 대화 보기</button>}
        {state.data.hasNewer && <button type="button" className="admin-outline-button" onClick={() => { setBeforeId(null); setState({ status: 'loading', data: null, error: '' }); }}>최근 대화 보기</button>}
      </div>}
    </>}
  </section>;
}
