import { Fragment } from 'react';
import { GitCompare } from 'lucide-react';
import theme from '../../styles/theme';
import ModelDetail from './ModelDetail';
import { formatLogTime } from './adminLogFormat';
import { baselineGap, count, logLoss, percent } from './modelMetricFormat';

// 모델 관리 — 모델 비교 표: 학습 결과 폴더(ml/outputs/models/<계열>/<폴더>)마다 한 줄 (GET /admin/models)
// 학습 · 평가 지표 = 학습 결과 파일, 서빙 상태 = 추천 서버 응답, 요청 수 = recommendation_model_daily_usage, 진단 수 = model_versions · analysis_runs
// 정확도의 뜻(시나리오 선택 / 쌍 비교)이 계열마다 달라, 같은 평가 방식끼리만 비교하도록 줄마다 평가 방식을 함께 보여 준다
// [상세 보기] 는 회원 관리와 같다: 누른 줄 바로 아래에 펼치고, [닫기] · X 로 접는다

const COLUMNS = 10;
const SERVER_BADGES = {
  RUNNING: ['is-ok', '서빙 중'], STARTING: ['is-neutral', '켜는 중'], FAILED: ['is-check', '켜기 실패'], OFF: ['is-neutral', '꺼짐'],
};

export default function ModelComparisonTable({ models, upstreams, selectedRunId, onSelect }) {
  return (
    <section className="admin-card" aria-labelledby="model-comparison-title">
      <div className="admin-card-heading">
        <div>
          <h3 id="model-comparison-title">모델 비교</h3>
          <p>학습 결과 폴더별 평가 지표와 실제 사용량 · [상세 보기] 로 학습 결과와 학습 기록을 봅니다</p>
        </div>
        <GitCompare size={theme.iconSize.md} aria-hidden="true" />
      </div>
      {models.length === 0 ? (
        <p className="admin-empty" role="status">학습 결과 폴더가 없습니다 (ml/outputs/models/…).</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table model-comparison-table">
            <caption className="admin-sr-only">모델별 평가 지표 · 서빙 상태 · 사용량</caption>
            <thead>
              <tr>
                <th scope="col">모델</th>
                <th scope="col">학습일</th>
                <th scope="col">시험 정확도</th>
                <th scope="col">log loss</th>
                <th scope="col">기준 대비</th>
                <th scope="col">상태</th>
                <th scope="col">비율</th>
                <th scope="col">최근 7일 요청</th>
                <th scope="col">저장된 진단</th>
                <th scope="col">상세</th>
              </tr>
            </thead>
            <tbody>
              {models.map((row) => {
                const key = row.runId ?? row.runName;
                const selected = row.runId != null && row.runId === selectedRunId;
                const [badgeClass, badgeText] = SERVER_BADGES[row.serverState] ?? SERVER_BADGES.OFF;
                const server = upstreams.find((upstream) => upstream.up && upstream.modelBundle === row.runName);
                return (
                  <Fragment key={key}>
                    <tr className={selected ? 'is-selected' : undefined}>
                      <th scope="row">
                        <strong>{row.runName}</strong>
                        <small>{row.family ?? '학습 결과 폴더 없음'} · {row.schema ?? '-'}</small>
                        <small>가상 가구 {count(row.profiles)}</small>
                      </th>
                      <td>{row.trainedAt ? formatLogTime(row.trainedAt) : '-'}</td>
                      <td className="is-number"><strong>{percent(row.testAccuracy)}</strong>{row.metricKind && <small>{row.metricKind}</small>}</td>
                      <td className="is-number">{logLoss(row.testLogLoss)}</td>
                      <td className="is-number">{baselineGap(row)}{row.baselineLabel && <small>{row.baselineLabel} {percent(row.baselineAccuracy)}</small>}</td>
                      <td>
                        <span className="model-comparison-badges">
                          <span className={`admin-status ${badgeClass}`}>{badgeText}</span>
                          {!row.compatible && <span className="admin-status is-check">입력 구조 다름</span>}
                        </span>
                      </td>
                      <td className="is-number"><strong>{row.weightPercent}%</strong></td>
                      <td className="is-number">{count(row.requests7Days)}건</td>
                      <td className="is-number">{count(row.diagnoses)}건</td>
                      <td>
                        {row.runId ? (
                          <button type="button" className="admin-text-button" aria-expanded={selected}
                            aria-controls={selected ? `model-detail-${row.runName}` : undefined}
                            onClick={() => onSelect(selected ? null : row.runId)}>
                            {selected ? '닫기' : '상세 보기'}
                          </button>
                        ) : '-'}
                      </td>
                    </tr>
                    {selected && (
                      <tr className="model-detail-row">
                        <td colSpan={COLUMNS}>
                          <ModelDetail row={row} server={server} onClose={() => onSelect(null)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-result-count">
        정확도는 가상 가구 데이터로 만든 정답과의 일치도이며 실제 사용자 만족도는 아닙니다. 평가 방식이 다른 모델끼리는 그대로 비교하지 마세요.
      </p>
    </section>
  );
}
