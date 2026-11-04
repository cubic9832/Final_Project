import { Fragment, useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Search, ArrowUp, ArrowDown } from 'lucide-react';
import theme from '../../styles/theme';
import Pagination from '../../components/Pagination';
import { getAdminChatbotExchanges, getAdminChatbotMessages } from '../../features/chatbot/chatApi';
import './AdminChatbotPanel.css';

const sourceLabels = { DIRECT_INPUT: '직접 입력', QUICK_QUESTION: '추천 질문', TERM_CLICK: '용어 클릭' };
const ratingLabels = { LIKE: '좋아요', DISLIKE: '싫어요' };
const failureMessage = (failure) => failure.response?.data?.detail || failure.response?.data?.error?.message || '조회하지 못했습니다. 다시 시도해 주세요.';

export default function AdminChatbotPanel() {
  const [query, setQuery] = useState({ rating: 'ALL', page: 0, keyword: '', sort: '', direction: 'ASC' });
  const [keyword, setKeyword] = useState('');
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
    const same = query.sort === column;
    const clear = same && query.direction === 'DESC';
    changeQuery({ ...query, page: 0, sort: clear ? '' : column, direction: same && query.direction === 'ASC' ? 'DESC' : 'ASC' });
  }

  function select(item) {
    setSelected(selected?.answerId === item.answerId ? null : item);
    setContextOpen(false);
  }

  return <div className="admin-panel-stack compa-admin">
    <section className="admin-card">
      <div className="compa-admin-heading"><h3>콤파 대화 기록</h3>
      <form className="compa-admin-toolbar" onSubmit={(event) => { event.preventDefault(); changeQuery({ ...query, keyword: keyword.trim(), page: 0 }); }}>
        <div className="compa-admin-search form-focus-group">
          <input type="search" aria-label="질문 내용 또는 회원 닉네임 검색" placeholder="질문·회원 닉네임 검색" value={keyword} maxLength={50} onChange={(event) => setKeyword(event.target.value)} />
          <button type="submit" className="compa-admin-search-submit" aria-label="질문 또는 회원 닉네임 검색"><Search size={theme.iconSize.md} aria-hidden="true" /></button>
        </div>
      </form>
      </div>
      {state.status === 'loading' && <p className="admin-empty" role="status">대화 기록을 불러오는 중…</p>}
      {state.status === 'error' && <p className="admin-empty" role="alert">{state.error} <button type="button" className="admin-text-button" onClick={() => { setState({ status: 'loading', data: null, error: '' }); setReload((value) => value + 1); }}>다시 시도</button></p>}
      {state.status === 'done' && <>
        {state.data.ratingCounts && <p className="compa-admin-rating-counts" role="status"><span>좋아요 {state.data.ratingCounts.likes.toLocaleString()}건</span><span>싫어요 {state.data.ratingCounts.dislikes.toLocaleString()}건</span><span>평가 없음 {state.data.ratingCounts.unrated.toLocaleString()}건</span></p>}
        <div className="compa-admin-table-wrap"><table className="compa-admin-table">
          <caption className="sr-only">콤파 질문·답변 및 평가 목록</caption>
          <colgroup>{[8, 30, 10, 12, 8, 11, 14, 7].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
          <thead><tr>{[
            ['number', '번호'], ['question', '질문'], ['member', '회원'], ['source', '질문 방식'], ['answer', '답변'], ['rating', '평가'], ['createdAt', '등록일'],
          ].map(([column, label]) => {
            const active = query.sort === column;
            const SortIcon = query.direction === 'ASC' ? ArrowUp : ArrowDown;
            const next = active ? (query.direction === 'ASC' ? '내림차순 정렬' : '정렬 해제') : '오름차순 정렬';
            return <th scope="col" key={column} aria-sort={active ? (query.direction === 'ASC' ? 'ascending' : 'descending') : 'none'}><button type="button" className="compa-admin-sort" aria-label={label + ' ' + next} onClick={() => sortBy(column)}>{label}<span className="compa-admin-sort-icon" aria-hidden="true">{active && <SortIcon size={theme.iconSize.sm} />}</span></button></th>;
          })}<th scope="col">상세</th></tr></thead>
          <tbody>{state.data.items.length === 0 ? <tr><td colSpan={8} className="compa-admin-empty">조건에 맞는 대화가 없습니다.</td></tr> : state.data.items.map((item) => <Fragment key={item.answerId}>
            <tr className={selected?.answerId === item.answerId ? 'compa-admin-selected' : ''}>
              <td>{item.number}</td>
              <td className="compa-admin-question"><button type="button" className="compa-admin-subject" aria-expanded={selected?.answerId === item.answerId} aria-controls={`compa-admin-detail-${item.answerId}`} onClick={() => select(item)}>{item.question}</button></td>
              <td>{item.userName || '닉네임 없음'}</td>
              <td>{sourceLabels[item.questionSource] || item.questionSource}</td><td>{item.answerType === 'FIXED' ? '고정' : 'AI'}</td>
              <td><span className="compa-admin-rating">{item.rating === 'LIKE' ? <ThumbsUp size={theme.iconSize.sm} aria-hidden="true" /> : item.rating === 'DISLIKE' ? <ThumbsDown size={theme.iconSize.sm} aria-hidden="true" /> : null}{ratingLabels[item.rating] || '평가 없음'}</span></td>
              <td><time dateTime={item.createdAt}>{item.createdAt?.slice(0, 10)}</time></td>
              <td><button className="admin-text-button" type="button" aria-expanded={selected?.answerId === item.answerId} aria-controls={`compa-admin-detail-${item.answerId}`} aria-label={`${item.question} 상세 ${selected?.answerId === item.answerId ? '접기' : '보기'}`} onClick={() => select(item)}>{selected?.answerId === item.answerId ? '접기' : '보기'}</button></td>
            </tr>
            {selected?.answerId === item.answerId && <tr><td colSpan={8} className="compa-admin-detail-cell"><section className="compa-admin-detail" id={`compa-admin-detail-${item.answerId}`} aria-label="질문과 답변 상세">
              <h3>질문</h3><p>{item.question}</p><h3>콤파 답변</h3><p>{item.answer}</p>
              <button type="button" className="admin-outline-button" aria-expanded={contextOpen} onClick={() => setContextOpen(!contextOpen)}><MessageSquare size={theme.iconSize.sm} aria-hidden="true" />{contextOpen ? '대화 맥락 접기' : '대화 맥락 보기'}</button>
              {contextOpen && <Conversation key={item.conversationId} exchange={item} />}
            </section></td></tr>}
          </Fragment>)}</tbody>
        </table></div>
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
