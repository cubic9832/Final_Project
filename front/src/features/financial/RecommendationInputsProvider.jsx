import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSavedRecommendationInputs, patchRecommendationInputs } from './recommendationInputsApi.js';
import useAuthStore from '../../stores/useAuthStore.js';
import { recommendationInputPayload, mergeRecommendationInputs } from './recommendationInputs.js';
import { clearFinancialDraft, readFinancialSession, saveFinancialSession } from './financialSession.js';

import { RecommendationInputsContext } from './useRecommendationInputSave.js';

export default function RecommendationInputsProvider({ children }) {
  const navigate = useNavigate();
  const memberId = useAuthStore(state => state.member?.id);
  const [status, setStatus] = useState(memberId ? 'loading' : 'ready');
  const [message, setMessage] = useState('');
  const [resolving, setResolving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);
  const [revision, setRevision] = useState(0);
  const version = useRef(0);
  const controller = useRef(null);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    const abort = new AbortController();
    controller.current = abort;
    if (memberId) {
      getSavedRecommendationInputs(abort.signal).then(saved => {
        if (abort.signal.aborted) return;
        if (saved && saved.schemaVersion !== 1) throw new Error('지원하지 않는 저장 형식입니다.');
        version.current = saved?.version ?? 0;
        const draft = readFinancialSession();
        saveFinancialSession(mergeRecommendationInputs(saved, draft));
        setStatus('ready');
        setMessage(saved ? '저장한 입력을 불러왔어요. 내용을 확인해 주세요.' : '');
      }).catch(() => { if (!abort.signal.aborted) setStatus('load-error'); });
    }
    return () => { active.current = false; abort.abort(); };
  }, [memberId, revision]);

  async function save(area, draft) {
    if (!memberId) return true;
    if (pending.current || status !== 'ready') return false;
    pending.current = true;
    setFieldErrors([]);
    setMessage('입력 정보를 저장하고 있어요…');
    try {
      const saved = await patchRecommendationInputs({ version: version.current, ...recommendationInputPayload({ ...readFinancialSession(), ...draft }, area) }, controller.current.signal);
      if (!active.current || useAuthStore.getState().member?.id !== memberId) return false;
      version.current = saved.version;
      setMessage('입력 정보를 저장했어요.');
      return true;
    } catch (error) {
      if (active.current) {
        setFieldErrors(error.response?.data?.errors ?? []);
        if (error.response?.status === 409) setStatus('conflict');
        setMessage(error.response?.status === 409 ? '다른 곳에서 입력 정보가 변경되었습니다.' : '입력을 저장하지 못했어요. 입력은 유지됩니다. 다음 버튼으로 다시 시도해 주세요.');
      }
      return false;
    } finally { pending.current = false; }
  }
  async function resolveConflict(keepCurrent) {
    if (pending.current) return;
    pending.current = true;
    setResolving(true);
    setMessage('최신 정보를 확인하고 있어요…');
    try {
      const saved = await getSavedRecommendationInputs(controller.current.signal);
      if (!active.current) return;
      version.current = saved?.version ?? 0;
      if (keepCurrent) { setStatus('ready'); setMessage('현재 입력을 유지했습니다. 다음 버튼으로 저장해 주세요.'); }
      else {
        if (saved?.schemaVersion !== 1) throw new Error();
        clearFinancialDraft();
        saveFinancialSession({ ...saved.financialInputs, vehicle: saved.vehiclePreferences });
        window.location.assign('/financial');
      }
    } catch {
      if (active.current) setMessage('최신 정보를 불러오지 못했어요. 다시 시도해 주세요.');
    } finally {
      pending.current = false;
      if (active.current) setResolving(false);
    }
  }
  if (status === 'loading') return <p role="status">저장한 입력을 불러오고 있어요…</p>;
  if (status === 'load-error') return <section role="alert"><p>저장한 입력을 불러오지 못했어요.</p><button onClick={() => { setStatus('loading'); setRevision(value => value + 1); }}>다시 시도</button><button onClick={() => { clearFinancialDraft(); navigate('/financial', { replace: true, state: null }); setStatus('ready'); setMessage('새 입력을 시작했습니다. 기존 저장값이 있으면 저장 시 확인합니다.'); }}>새 입력 시작</button></section>;
  return <RecommendationInputsContext.Provider value={{ save, fieldErrors }}>
    {message && <p role="status">{message}</p>}
    {status === 'conflict' && <section role="alert"><button disabled={resolving} onClick={() => resolveConflict(false)}>최신 저장값 불러오기</button><button disabled={resolving} onClick={() => resolveConflict(true)}>현재 입력 유지 후 저장</button></section>}
    {children}
  </RecommendationInputsContext.Provider>;
}
