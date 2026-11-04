import { useCallback, useEffect, useState } from 'react';
import { Cpu, Database, History } from 'lucide-react';
import theme from '../../styles/theme';
import ModelMetricChart from './ModelMetricChart';
import ModelComparisonTable from './ModelComparisonTable';
import ModelTrafficCard from './ModelTrafficCard';
import { formatLogTime } from './adminLogFormat';
import { getModelReport, getModels } from '../../features/admin/adminApi';
import './AdminModelsPanel.css';

// 7단계 모델 관리 — 모두 실제 값
// ① 트래픽 분배: 모델별 비율 (DB recommendation_model_traffic) — 총관리자만 바꾼다
// ② 모델 비교: 학습 결과 폴더 전체 + 추천 서버 상태 · 최근 7일 요청 수 · 저장된 진단 수 (GET /admin/models)
// ③ 선택한 모델 상세: 학습 · 평가 결과 파일 (GET /admin/model-report?run=) + 그 모델을 쓰는 추천 서버의 후보 차량 수
// ④ 모델 버전 기록: DB(model_versions)
const percent = (value) => `${(value * 100).toFixed(1)}%`;
const count = (value) => (value == null ? '-' : value.toLocaleString('ko-KR'));

// 처음 고를 모델: 비율이 가장 큰 모델 → 서빙 중인 모델 → 표의 첫 줄
const defaultRunId = (models) => {
  const withFolder = models.filter((row) => row.runId);
  const weighted = [...withFolder].sort((a, b) => b.weightPercent - a.weightPercent)[0];
  return (weighted?.weightPercent > 0 ? weighted : withFolder.find((row) => row.servable) ?? withFolder[0])?.runId;
};

export default function AdminModelsPanel() {
  const [comparison, setComparison] = useState(); // undefined 불러오는 중 · null 실패
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState();
  // 상세는 어떤 비교 결과 · 어떤 모델에 대한 응답인지 함께 기억 → 고른 모델이 바뀌면 바로 "불러오는 중"
  const [loadedReport, setLoadedReport] = useState({ source: null, runId: null, report: undefined });

  // 저장 뒤 다시 불러올 때는 지금 화면을 유지한 채 새 값으로 바꾼다
  useEffect(() => {
    const controller = new AbortController();
    getModels(controller.signal)
      .then((data) => {
        setComparison(data);
        setSelectedRunId((current) => (current && data.models.some((row) => row.runId === current) ? current : defaultRunId(data.models)));
      })
      .catch(() => !controller.signal.aborted && setComparison(null));
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!comparison) return undefined;
    const controller = new AbortController();
    const done = (report) => !controller.signal.aborted && setLoadedReport({ source: comparison, runId: selectedRunId, report });
    getModelReport(controller.signal, selectedRunId).then(done).catch(() => done(null));
    return () => controller.abort();
  }, [comparison, selectedRunId]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const retry = () => { setComparison(undefined); reload(); };

  if (comparison === undefined) return <p className="admin-empty" role="status">모델 정보를 불러오는 중…</p>;
  if (comparison === null) {
    return <div className="admin-empty" role="alert"><p>모델 정보를 불러오지 못했습니다.</p>
      <button type="button" className="admin-outline-button model-retry" onClick={retry}>다시 불러오기</button></div>;
  }

  const report = loadedReport.source === comparison && loadedReport.runId === selectedRunId ? loadedReport.report : undefined;
  const selected = comparison.models.find((row) => row.runId === selectedRunId);
  const server = selected && comparison.upstreams.find((upstream) => upstream.up && upstream.modelBundle === selected.runName);
  // 저장한 비율이 바뀌면 분배 카드의 입력값을 새 값으로 다시 시작한다
  const trafficKey = comparison.models.map((row) => `${row.runName}:${row.weightPercent}:${row.servable}`).join('|');

  return <div className="admin-panel-stack">
    <ModelTrafficCard key={trafficKey} models={comparison.models} upstreams={comparison.upstreams}
      trafficConfigured={comparison.trafficConfigured} onSaved={reload} />
    <ModelComparisonTable models={comparison.models} selectedRunId={selectedRunId} onSelect={setSelectedRunId} />
    <ModelDetail report={report} selected={selected} server={server} />
  </div>;
}

// 선택한 모델 상세 (학습 · 평가 결과, 학습 기록, 모델 버전 기록)
function ModelDetail({ report, selected, server }) {
  if (report === undefined) return <p className="admin-empty" role="status">선택한 모델의 학습 결과를 불러오는 중…</p>;
  if (report === null) return <p className="admin-empty" role="alert">선택한 모델의 학습 결과를 불러오지 못했습니다.</p>;

  const split = report.splitProfiles;
  return <>
    <div className="admin-grid-2">
      <section className="admin-card"><div className="admin-card-heading"><div><h3>선택한 모델</h3><p>학습 결과 파일과 이 모델을 쓰는 추천 서버 정보</p></div><Cpu size={theme.iconSize.md} aria-hidden="true" /></div>
        <div className="admin-model-version"><strong>{report.runName ?? '-'}</strong>
          <span className={`admin-status ${server ? 'is-ok' : 'is-neutral'}`}>{server ? `서빙 중 · 비율 ${selected?.weightPercent ?? 0}%` : '추천 서버 꺼짐'}</span></div>
        <dl className="admin-detail-list">
          <div><dt>계열</dt><dd>{selected?.family ?? '-'}</dd></div>
          <div><dt>입력 구조</dt><dd>{report.schema ?? '-'}</dd></div>
          <div><dt>학습일</dt><dd>{report.trainedAt ? formatLogTime(report.trainedAt) : '-'}</dd></div>
          <div><dt>추천 후보 차량</dt><dd>{server ? `${count(server.catalogCount)}건 · 차종 ${count(server.modelNames)}개 (${server.baseUrl})` : '-'}</dd></div>
          <div><dt>학습 데이터</dt><dd>{report.available && split ? `가상 가구 ${count(report.profiles)} (학습 ${count(split.train)} · 검증 ${count(split.validation)} · 시험 ${count(split.test)})` : '-'}</dd></div>
          <div><dt>처음 보는 차종 평가</dt><dd>{report.heldOutModels != null ? `${report.heldOutModels}개 차종을 학습에서 빼고 평가` : '-'}</dd></div>
          <div><dt>시험 정확도</dt><dd>{selected?.testAccuracy != null ? `${percent(selected.testAccuracy)} (${selected.metricKind})` : '-'}</dd></div>
          <div><dt>재무 조건 위반 추천</dt><dd>{report.financialViolations != null ? `${report.financialViolations}건` : '-'}</dd></div>
        </dl>
        {!report.available && <p className="admin-empty" role="alert">학습 결과 파일을 읽지 못했습니다 (ml/outputs/models/…).</p>}
      </section>
      <section className="admin-card"><div className="admin-card-heading"><div><h3>이전 모델 대비 지표</h3><p>상위 3대 추천 지표 (0~1, 높을수록 좋음)</p></div></div>
        {report.metrics.length > 0
          ? <ModelMetricChart metrics={report.metrics} previousLabel="이전 모델" currentLabel="이 모델" />
          : <p className="admin-empty">이 모델의 학습 결과에는 이전 모델 대비 지표가 없습니다.</p>}
        {report.meaning && <p className="admin-empty" title={report.meaning}>평가 기준: 가상 가구 데이터로 만든 정답과의 일치도이며, 실제 사용자 만족도는 아닙니다.</p>}
      </section>
    </div>
    <section className="admin-card"><div className="admin-card-heading"><div><h3>학습 기록</h3><p>에포크(학습 반복)별 손실과 검증 정확도</p></div><History size={theme.iconSize.md} aria-hidden="true" /></div>
      {report.history.length === 0 ? <p className="admin-empty">학습 기록이 없습니다.</p> : <div className="admin-table-wrap"><table className="admin-table"><caption className="admin-sr-only">에포크별 학습 기록</caption>
        <thead><tr><th scope="col">에포크</th><th scope="col">손실</th><th scope="col">검증 정확도</th></tr></thead>
        <tbody>{report.history.map(row => <tr key={row.epoch}><td><strong>{row.epoch}</strong></td><td>{row.loss.toFixed(4)}</td><td>{percent(row.validationPairAccuracy)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="admin-card"><div className="admin-card-heading"><div><h3>모델 버전 기록</h3><p>재무 진단을 저장할 때 쓰인 모델 (DB)</p></div><Database size={theme.iconSize.md} aria-hidden="true" /></div>
      {report.versions.length === 0 ? <p className="admin-empty">아직 재무 진단에 쓰인 모델 버전이 없습니다.</p> : <div className="admin-table-wrap"><table className="admin-table"><caption className="admin-sr-only">모델 버전 기록</caption>
        <thead><tr><th scope="col">처음 쓰인 시각</th><th scope="col">버전</th><th scope="col">방식</th><th scope="col">저장된 재무 진단</th></tr></thead>
        <tbody>{report.versions.map(row => <tr key={row.versionLabel}><td>{formatLogTime(row.createdAt)}</td><td><strong>{row.versionLabel}</strong></td><td>{row.executionType}</td><td>{row.diagnoses}건</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
