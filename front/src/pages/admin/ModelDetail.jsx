import { useEffect, useState } from 'react';
import { Cpu, History, X } from 'lucide-react';
import theme from '../../styles/theme';
import ModelMetricChart from './ModelMetricChart';
import { formatLogTime } from './adminLogFormat';
import { baselineGap, count, logLoss, percent } from './modelMetricFormat';
import { getModelReport } from '../../features/admin/adminApi';

// 모델 관리 — 모델 상세 (비교 표에서 [상세 보기] 를 누른 줄 바로 아래. 회원 관리의 회원 상세와 같은 방식)
// 학습 · 평가 결과는 열 때만 불러온다 (GET /admin/model-report?run=계열/폴더)
// 배치: 위 왼쪽 모델 정보 · 오른쪽 평가 지표, 아래 학습 기록 (예전 "현재 적용 모델 / 성능 비교 / 학습 기록" 순서)

const SERVER_LABELS = { RUNNING: '서빙 중', STARTING: '켜는 중', FAILED: '켜기 실패', OFF: '꺼짐' };

export default function ModelDetail({ row, server, onClose }) {
  const [loaded, setLoaded] = useState({ attempt: -1, report: undefined }); // report: undefined 불러오는 중 · null 실패
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const done = (report) => !controller.signal.aborted && setLoaded({ attempt, report });
    getModelReport(controller.signal, row.runId).then(done).catch(() => done(null));
    return () => controller.abort();
  }, [row.runId, attempt]);

  const report = loaded.attempt === attempt ? loaded.report : undefined;
  const split = report?.splitProfiles;

  return (
    <div className="model-detail" id={`model-detail-${row.runName}`}>
      <div className="admin-card-heading">
        <div>
          <h3>{row.runName} 상세</h3>
          <p>{row.family} · {row.schema ?? '-'}</p>
        </div>
        <button type="button" className="admin-icon-button" aria-label={`${row.runName} 상세 닫기`} onClick={onClose}>
          <X size={theme.iconSize.md} aria-hidden="true" />
        </button>
      </div>

      {report === undefined && <p className="admin-empty" role="status">학습 결과를 불러오는 중…</p>}
      {report === null && (
        <div className="admin-empty" role="alert">
          <p>학습 결과를 불러오지 못했습니다.</p>
          <button type="button" className="admin-outline-button model-retry" onClick={() => setAttempt((n) => n + 1)}>다시 불러오기</button>
        </div>
      )}
      {report && <>
        <div className="model-detail-grid">
          <section className="model-detail-section" aria-labelledby={`model-info-${row.runName}`}>
            <h4 id={`model-info-${row.runName}`}><Cpu size={theme.iconSize.sm} aria-hidden="true" />모델 정보</h4>
            <div className="admin-model-version">
              <span className={`admin-status ${row.serverState === 'RUNNING' ? 'is-ok' : row.serverState === 'FAILED' ? 'is-check' : 'is-neutral'}`}>
                {SERVER_LABELS[row.serverState] ?? '꺼짐'}{row.serverState === 'RUNNING' && ` · 비율 ${row.weightPercent}%`}
              </span>
            </div>
            <dl className="admin-detail-list">
              <div><dt>학습일</dt><dd>{report.trainedAt ? formatLogTime(report.trainedAt) : '-'}</dd></div>
              <div><dt>추천 서버</dt><dd>{server ? `${server.baseUrl} · 후보 ${count(server.catalogCount)}건 · 차종 ${count(server.modelNames)}개` : '-'}</dd></div>
              <div><dt>학습 데이터</dt><dd>{report.available && split ? `가상 가구 ${count(report.profiles)} (학습 ${count(split.train)} · 검증 ${count(split.validation)} · 시험 ${count(split.test)})` : count(row.profiles)}</dd></div>
              <div><dt>처음 보는 차종</dt><dd>{report.heldOutModels != null ? `${report.heldOutModels}개 차종을 학습에서 빼고 평가` : '-'}</dd></div>
              <div><dt>재무 조건 위반</dt><dd>{report.financialViolations != null ? `${report.financialViolations}건` : '-'}</dd></div>
              <div><dt>사용량</dt><dd>최근 7일 요청 {count(row.requests7Days)}건 · 저장된 진단 {count(row.diagnoses)}건</dd></div>
            </dl>
          </section>
          <section className="model-detail-section" aria-labelledby={`model-metric-${row.runName}`}>
            <h4 id={`model-metric-${row.runName}`}>평가 지표</h4>
            <dl className="model-detail-figures">
              <div><dt>시험 정확도</dt><dd>{percent(row.testAccuracy)}</dd><small>{row.metricKind ?? '-'}</small></div>
              <div><dt>log loss</dt><dd>{logLoss(row.testLogLoss)}</dd><small>낮을수록 좋음</small></div>
              <div><dt>{row.baselineLabel ?? '기준'} 대비</dt><dd>{baselineGap(row)}</dd><small>{row.baselineLabel ? `${row.baselineLabel} ${percent(row.baselineAccuracy)}` : '비교 기준 없음'}</small></div>
            </dl>
            {report.metrics.length > 0 && <ModelMetricChart metrics={report.metrics} previousLabel="이전 모델" currentLabel="이 모델" />}
            <p className="admin-feedback">가상 가구 데이터로 만든 정답과의 일치도이며, 실제 사용자 만족도는 아닙니다.</p>
          </section>
        </div>

        <section className="model-detail-section" aria-labelledby={`model-history-${row.runName}`}>
          <h4 id={`model-history-${row.runName}`}><History size={theme.iconSize.sm} aria-hidden="true" />학습 기록 <span>에포크 {report.history.length}회</span></h4>
          {report.history.length === 0 ? <p className="admin-empty">학습 기록이 없습니다.</p> : (
            <div className="model-history-wrap" tabIndex={0} aria-label={`${row.runName} 에포크별 학습 기록 (스크롤)`}>
              <table className="admin-table model-history-table">
                <caption className="admin-sr-only">에포크별 손실과 검증 정확도</caption>
                <thead><tr><th scope="col">에포크</th><th scope="col">손실</th><th scope="col">검증 정확도</th></tr></thead>
                <tbody>{report.history.map((epoch) => (
                  <tr key={epoch.epoch}><td>{epoch.epoch}</td><td>{epoch.loss.toFixed(4)}</td><td>{percent(epoch.validationPairAccuracy)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </>}
    </div>
  );
}
