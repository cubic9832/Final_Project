import { useCallback, useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import theme from '../../styles/theme';
import ModelComparisonTable from './ModelComparisonTable';
import ModelTrafficCard from './ModelTrafficCard';
import { formatLogTime } from './adminLogFormat';
import { getModels } from '../../features/admin/adminApi';
import './AdminModelsPanel.css';

// 7단계 모델 관리 — 모두 실제 값 (GET /admin/models 한 번으로)
// ① 트래픽 분배: 모델 켜기 · 끄기(추천 서버 프로세스)와 모델별 비율 (DB recommendation_model_traffic) — 총관리자만 바꾼다
// ② 모델 비교: 학습 결과 폴더 전체 + 서빙 상태 · 최근 7일 요청 수 · 저장된 진단 수. [상세 보기] 는 누른 줄 아래에 학습 결과 · 학습 기록
// ③ 모델 버전 기록: DB(model_versions) — 특정 모델이 아니라 전체 기록이라 맨 아래 따로 둔다
const STARTING_POLL_MS = 3000; // 켜는 중인 모델이 있으면 이 간격으로 상태를 다시 본다

export default function AdminModelsPanel() {
  const [comparison, setComparison] = useState(); // undefined 불러오는 중 · null 실패
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshError, setRefreshError] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null); // 처음에는 아무 상세도 펼치지 않는다 (회원 관리와 같음)

  // 다시 불러올 때는 지금 화면을 유지한 채 새 값으로 바꾼다 (입력 중인 비율 · 펼친 상세 유지)
  useEffect(() => {
    const controller = new AbortController();
    getModels(controller.signal)
      .then(data => { if (!controller.signal.aborted) { setComparison(data); setRefreshError(false); } })
      .catch(() => { if (!controller.signal.aborted) { setRefreshError(true); setComparison(current => current === undefined ? null : current); } });
    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const starting = comparison?.models.some((row) => row.serverState === 'STARTING');

  useEffect(() => {
    if (!starting) return undefined;
    const timer = setTimeout(reload, STARTING_POLL_MS);
    return () => clearTimeout(timer);
  }, [starting, comparison, reload, reloadKey]);

  const retry = () => { setComparison(undefined); reload(); };

  if (comparison === undefined) return <p className="admin-empty" role="status">모델 정보를 불러오는 중…</p>;
  if (comparison === null) {
    return <div className="admin-empty" role="alert"><p>모델 정보를 불러오지 못했습니다.</p>
      <button type="button" className="admin-outline-button model-retry" onClick={retry}>다시 불러오기</button></div>;
  }

  return <div className="admin-panel-stack">
    {refreshError && <p role="alert">최신 모델 상태를 불러오지 못했습니다. <button type="button" onClick={reload}>다시 불러오기</button></p>}
    <ModelTrafficCard models={comparison.models} upstreams={comparison.upstreams} trafficConfigured={comparison.trafficConfigured}
      launcherEnabled={comparison.launcherEnabled} onChanged={reload} />
    <ModelComparisonTable models={comparison.models} upstreams={comparison.upstreams}
      selectedRunId={selectedRunId} onSelect={setSelectedRunId} />
    <section className="admin-card"><div className="admin-card-heading"><div><h3>모델 버전 기록</h3><p>재무 진단을 저장할 때 쓰인 모델 (DB)</p></div><Database size={theme.iconSize.md} aria-hidden="true" /></div>
      {comparison.versions.length === 0 ? <p className="admin-empty">아직 재무 진단에 쓰인 모델 버전이 없습니다.</p> : <div className="admin-table-wrap"><table className="admin-table"><caption className="admin-sr-only">모델 버전 기록</caption>
        <thead><tr><th scope="col">처음 쓰인 시각</th><th scope="col">버전</th><th scope="col">방식</th><th scope="col">저장된 재무 진단</th></tr></thead>
        <tbody>{comparison.versions.map(row => <tr key={row.versionLabel}><td>{formatLogTime(row.createdAt)}</td><td><strong>{row.versionLabel}</strong></td><td>{row.executionType}</td><td>{row.diagnoses}건</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
