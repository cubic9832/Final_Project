import { useEffect, useState } from 'react';
import { getMemberSummary } from '../../features/admin/adminApi';
import MemberBoard from './members/MemberBoard.jsx';

export default function AdminMembersPanel() {
  const [version, setVersion] = useState(0);
  const [reloadSummary, setReloadSummary] = useState(0);
  const [summaryState, setSummaryState] = useState({ status: 'loading', data: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    getMemberSummary(controller.signal).then(data => {
      if (!controller.signal.aborted) setSummaryState({ status: 'done', data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setSummaryState({ status: 'error', data: null, error: error.response?.data?.error?.message || '회원 현황을 불러오지 못했습니다.' });
    });
    return () => controller.abort();
  }, [version, reloadSummary]);
  function retrySummary() { setSummaryState({ status: 'loading', data: null, error: '' }); setReloadSummary(value => value + 1); }
  return <MemberBoard version={version} onChanged={() => setVersion(value => value + 1)} summaryState={summaryState} onRetrySummary={retrySummary} />;
}
